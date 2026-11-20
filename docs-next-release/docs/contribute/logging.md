# Log from Optics code

> How the two Optics loggers, their handlers, the log files and secret masking work, and how to log from framework code.

Optics has a structured logging system with two loggers, file output and secret masking. It also connects to execution tracking. This page explains the logging architecture, its configuration and how to use it. For the user settings, see [Logging](https://optics-framework.org/docs/reference/config#logging) in the configuration reference.

## Overview

The logging system has these parts:

1. **Multiple logger instances**: one logger for each concern.
2. **Queue-based logging**: queue handlers that write records from a background thread.
3. **Rich console output**: formatted console output from the Rich library.
4. **File logging**: rotating file handlers for persistent logs.
5. **Sensitive data sanitization**: Optics masks secrets in every record.
6. **Session context**: session-scoped logging with a context manager.
7. **Log capture**: Optics keeps the logs of each keyword.

All of it is in [`optics_framework/common/logging_config.py`](https://github.com/mozarkai/optics-framework/blob/main/optics_framework/common/logging_config.py). `LoggingManager` builds the loggers and handlers once, when the module loads.

## Logger architecture

`Where a log record goes from each Optics logger`:

```mermaid
graph TB
    A[Application Code] --> B[Logger Instance]
    B --> C{Logger Type}
    C -->|Internal| D[internal_logger]
    C -->|Execution| E[execution_logger]
    D --> L[Rich Console Handler]
    D -.->|after decouple_console_logs| F[Queue Handler]
    F --> H[Internal Queue]
    H --> J[Queue Listener]
    J --> L
    E --> G[Queue Handler]
    G --> I[Execution Queue]
    E -->|propagate| R[Root Logger]
    D -->|file_log| N[File Handler]
    E -->|file_log| O[File Handler]
    E --> P[LogCaptureBuffer per keyword]
```

The handlers are not the same for the two loggers:

- `internal_logger` writes to its Rich console handler directly. Only `decouple_console_logs()` puts a queue between them. The stdio MCP server (`optics mcp`) calls it, so a client that does not read stderr cannot block the logger.
- `execution_logger` has a queue handler on the execution queue. No `QueueListener` reads that queue, and no code attaches `execution_console_handler`. Execution records reach the console only through the root logger, if the root has a handler. They also go to the log files when `file_log` is on, and to the `LogCaptureBuffer` of the keyword that runs.
- `shutdown_logging()` empties both queues at exit.

**Note:**
The execution queue has no reader, so its records stay in memory until the process ends. Keep this in mind for a long-lived process such as `optics serve`.

## Logger instances

### Internal logger

**Name:** `optics.internal`
**Purpose:** Framework-internal operations, debugging and development.

```python
from optics_framework.common.logging_config import internal_logger

internal_logger.debug("Debug message")
internal_logger.info("Information message")
internal_logger.warning("Warning message")
internal_logger.error("Error message")
```

**Characteristics:**

- Propagates to the root logger: **No** (`propagate = False`).
- Rich tracebacks: **No**. The console handler is `RichHandler(show_time=True, show_level=True)`. `SecretMaskingFilter` writes the traceback as masked text before a handler gets the record.
- Use cases: framework debugging, component initialization, error details.
- Every `ERROR` record also goes to the outcome of the current keyword (`keyword_outcome.py`). A keyword that logs an error without a raise can then show that error.

### Execution logger

**Name:** `optics.execution`
**Purpose:** Test execution events, keyword execution and information for the user.

```python
from optics_framework.common.logging_config import execution_logger

execution_logger.info("Test case started")
execution_logger.info("Keyword executed successfully")
execution_logger.warning("Element not found, trying fallback")
```

**Characteristics:**

- Propagates to the root logger: **Yes** (`propagate = True`).
- Rich tracebacks: **No** (cleaner output).
- Use cases: test execution tracking, keyword results, execution tracer logs.

## Logging configuration

### Configuration structure

You configure logging in the main configuration:

```yaml
# config.yaml
log_level: "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
file_log: true
log_path: "./logs/test_execution.log"  # Optional
json_log: false
json_path: "./logs/test_logs.json"  # Optional
execution_output_path: "./output"
```

| Key | Default | What logging does with it |
|---|---|---|
| `log_level` | `INFO` | Sets the level of both loggers and both console handlers. An unknown name becomes `INFO`. |
| `file_log` | `false` | Adds a file handler to each logger. |
| `log_path` | None | Sends both loggers to this one file. Without it, Optics writes `internal_logs.log` and `execution_logs.log`. |
| `execution_output_path` | `<project>/execution_output` | The folder for the two log files. When it is not set, Optics uses `logs/` in the current folder. |
| `json_log`, `json_path` | `false`, None | Not part of `logging_config.py`. The JUnit event handler writes the JSON event log (`logs.json`). See [Read results](https://optics-framework.org/docs/run/results). |

The `LoggingConfig` model in `logging_config.py` holds the four logging keys: `log_level`, `log_path`, `file_log` and `execution_output_path`. `initialize_handlers()` accepts a `LoggingConfig` or a full `Config`.

### Log levels

The framework uses the standard Python log levels:

- **DEBUG**: detailed information for troubleshooting.
- **INFO**: general information (the default).
- **WARNING**: warnings.
- **ERROR**: errors.
- **CRITICAL**: critical failures.

### Dynamic reconfiguration

You can reconfigure logging at runtime:

```python
from optics_framework.common.logging_config import reconfigure_logging
from optics_framework.common.config_handler import ConfigHandler

config_handler = ConfigHandler(config)
reconfigure_logging(config_handler.config)
```

**When reconfiguration occurs:**

- Session creation: `ConfigHandler.__init__` calls `initialize_handlers()`, and the HTTP API calls `reconfigure_logging()` for each new session.
- Configuration updates: `optics live` calls `initialize_handlers()` when it starts, with the config of the project and its screenshots folder as the output folder.
- Runtime configuration changes: any code can call `reconfigure_logging()`.

`initialize_handlers()` does not add a second file handler for a path that already has one.

## Log handlers

### Console handlers

`LoggingManager` makes one Rich console handler for each logger:

```python
# Internal logger - Rich, no tracebacks
internal_console_handler = RichHandler(
    show_time=True,
    show_level=True
)

# Execution logger - Clean Rich output
execution_console_handler = RichHandler(
    rich_tracebacks=False,
    show_time=True,
    show_level=True,
    markup=True
)
```

Earlier versions of the internal handler had `rich_tracebacks=True,` and `tracebacks_show_locals=True,`. Current code sets neither. As the [Logger architecture](#logger-architecture) shows, no code attaches `execution_console_handler` to a logger.

`quiet_console_logs()` sets both console handlers to `WARNING` after the result printer shows its summary. `restore_console_logs()` sets them back when a new live display starts. The file handlers keep their levels.

### File handlers

The file handlers are rotating file handlers:

```python
handler = RotatingFileHandler(
    path,
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=10  # Keep 10 backup files
)
```

**File handler features:**

- Rotation at 10MB.
- Keeps 10 backup files.
- Separate files for internal and execution logs: `internal_logs.log` and `execution_logs.log`.
- Configurable log paths. `log_path` puts both logs in one file.

`create_file_handler(path, log_level, formatter=None, use_sensitive=False)` makes each handler. The handlers go on the loggers directly, not through a queue.

### Queue handlers

The execution logger, and the internal logger after `decouple_console_logs()`, use a queue handler:

```python
execution_queue_handler = QueueHandler(self.execution_log_queue)
self.execution_logger.addHandler(self.execution_queue_handler)
```

**Benefits:**

- Thread-safe logging.
- Non-blocking log writes.
- Background processing, when a `QueueListener` reads the queue.
- Better performance.

## Sensitive data sanitization

`mask_secrets` in `logging_config.py` writes `****` in place of secrets. `SecretMaskingFilter` and `SensitiveDataFormatter` apply it to every log record. The JUnit handler applies it to the text and `message` values of `junit_output.xml` and to the `message`, `args` and `logs` of each `logs.json` event, before it writes them. The CLI applies it to error output and the *Cannot start* panel.

It masks:

- The secrets of the current session (`register_secret`, for example a value that a keyword keeps with `store_as` under a secret name).
- Secret-named text values from the config file and the environment variables it uses (`register_config_secret`, called by `resolve_config_file`). See [Configuration](https://optics-framework.org/docs/reference/config#logging) for the names that count as secret.
- Passwords in URLs: `https://user:****@host`.
- Query parameters with a secret name: `?token=****`.
- `@:name` references: `@:api_key` becomes `@:****`.

`SecretMaskingFilter` is on both loggers, so every handler gets the masked line. It also masks the traceback and the stack text. While a keyword reads a value for `store_as` under a secret name, `holding_logs_for_secret()` holds the log lines of that keyword. It releases them after the value is registered, so those lines are masked too.

## Session context logging

The framework has session-scoped logging:

```python
from optics_framework.common.logging_config import LoggerContext

with LoggerContext(session_id) as (session_execution_logger, session_internal_logger):
    session_execution_logger.info("Session-specific log message")
    # Logs include session_id automatically
```

The execution engine (`execution.py`) opens a `LoggerContext` for each run.

**SessionLoggerAdapter:**

- Adds `session_id` to the `extra` of each log record. No formatter prints it, so it shows only to a handler that reads `record.session_id`.
- Gives session-scoped logging.
- Used during test execution.

## Log capture

Optics captures the logs of each keyword with `LogCaptureBuffer`:

```python
from optics_framework.common.logging_config import LogCaptureBuffer

class LogCaptureBuffer(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records = []

    def emit(self, record):
        self.records.append(record)
```

It also has `clear()` and `get_records()`. `Junit_eventhandler.py` has its own copy of the same class.

**Usage in test runner:**

```python
capture_handler = LogCaptureBuffer()
execution_logger.addHandler(capture_handler)

# Execute keyword
execute_keyword(...)

# Get captured logs
logs = capture_handler.get_records()
```

`TestRunner._execute_keyword` in `common/runner/test_runnner.py` does this for each keyword.

**Use cases:**

- Capturing logs during keyword execution.
- Including logs in test results.
- Debugging keyword failures.
- Event logging.

## Integration with execution tracer

The execution tracer writes to the execution logger:

```python
from optics_framework.common.logging_config import execution_logger
from optics_framework.common.execution_tracer import execution_tracer

# Execution tracer automatically logs to execution_logger
execution_tracer.log_attempt(
    strategy=xpath_strategy,
    element="submit_button",
    status="success",
    duration=0.15
)
# Logs: "Trying XPathStrategy on 'submit_button' ... SUCCESS, duration: 0.15s"
```

`log_attempt(strategy, element, status, duration=None, error=None)` reads the name from `strategy.__class__.__name__`, so give a strategy instance, not the class. With the class `XPathStrategy`, the line names the metaclass. With `error`, the line is `Trying XPathStrategy on 'submit_button' ... FAIL (error: <error>)`. `log_attempt` also records the result for the outcome of the keyword.

Strategies do not call the tracer. `StrategyManager` calls `log_attempt` for each strategy that it tries, with the status `"success"` or `"fail"` and no duration. The line then shows `SUCCESS` or `FAIL`.

## Log format

### Console format

The Rich handler adds the time and the level. The message format is `%(message)s`.

**Internal logger:**

```text
12:34:56 INFO     Debug message
```

**Execution logger:**

```text
12:34:56 INFO     Test case started
```

This is the format of `execution_console_handler`. No code attaches it now, so you see execution lines in this format only if your code attaches the handler.

### File format

The log files use this format:

```text
2024-01-01 12:34:56,789 - INFO - Log message
```

**Format components:**

- Timestamp, with milliseconds.
- Level name.
- Message.

`initialize_handlers()` calls `create_file_handler(..., use_sensitive=True)`, which uses `TextLogFormatter('%(asctime)s - %(levelname)s - %(message)s')`. `TextLogFormatter` writes line breaks and control characters in a message as escapes, so a message cannot make a false record.

The module also has `LOG_FORMATTER`, which gives this format:

```text
INFO | 2024-01-01 12:34:56 | optics.internal:function_name:123 | Log message
```

Only a call to `create_file_handler()` with `use_sensitive=False` uses `LOG_FORMATTER`. The log files from `file_log` do not.

## Logging manager

The `LoggingManager` class manages all logging infrastructure:

```python
class LoggingManager:
    def __init__(self):
        # Initialize loggers
        # Set up handlers
        # Configure queues

    def initialize_handlers(self, config):
        # Configure handlers based on config
        # Add file handlers if enabled
        # Set log levels

    def shutdown_logging(self):
        # Clean shutdown
        # Stop listeners

    def stop_listeners(self):
        # Stop the queue listeners
```

It also has `disable_logger()`, `get_internal_logger()`, `get_execution_logger()` and `get_listeners()`. The module makes one instance, `logging_manager`. The module-level functions `initialize_handlers()`, `reconfigure_logging()` and `shutdown_logging()` call it.

## Shutdown and cleanup

The framework shuts down logging cleanly:

```python
from optics_framework.common.logging_config import shutdown_logging

# Automatically called on exit
atexit.register(shutdown_logging)
```

`logging_config.py` registers `shutdown_logging` with `atexit` when it loads.

**Shutdown process:**

1. Disable the root logger.
2. Stop the queue listeners.
3. Wait up to 2 seconds for the listener threads to stop.
4. Flush the handlers: close the JUnit handler of each active session.
5. Clear the log queues.

## Best practices

### 1. Use appropriate logger

```python
# Framework debugging
internal_logger.debug("Component initialized")

# Test execution events
execution_logger.info("Keyword executed")
```

### 2. Log levels

```python
# Debug: Detailed troubleshooting
internal_logger.debug("Element coordinates: (100, 200)")

# Info: General information
execution_logger.info("Test case completed")

# Warning: Non-critical issues
execution_logger.warning("Element not found, using fallback")

# Error: Errors that don't stop execution
execution_logger.error("Driver connection failed")

# Critical: Critical failures
internal_logger.critical("System error, shutting down")
```

### 3. Sensitive data

```python
# Good - sanitized
internal_logger.info("API key: @:api_key")

# Bad - exposed
internal_logger.info(f"API key: {api_key}")
```

A value with the `@:` prefix shows as `@:****`. A plain value is masked only when Optics registered it as a secret before.

### 4. Context information

```python
# Include context in messages
execution_logger.info(f"Element '{element_id}' located at ({x}, {y})")
```

### 5. Exception logging

```python
try:
    operation()
except Exception as e:
    internal_logger.exception("Operation failed", exc_info=e)
    # Logs full traceback
```

## Configuration examples

### Development configuration

```yaml
log_level: "DEBUG"
file_log: true
log_path: "./logs/dev.log"
```

### Production configuration

```yaml
log_level: "INFO"
file_log: true
log_path: "./logs/production.log"
json_log: true
json_path: "./logs/production.json"
```

### Minimal configuration

```yaml
log_level: "INFO"
# Uses defaults for everything else
```

## Troubleshooting

### Logs not appearing

**Problem:** Logs do not show in the console or in the files.

**Solutions:**

1. Check the log level configuration.
2. Make sure that the handlers are initialized. File handlers need `file_log: true`.
3. Check the file permissions for file logging.
4. Check how the configuration loads.
5. Remember that execution logger records reach the console only through a root logger handler.

### Too many logs

**Problem:** There is too much log output.

**Solutions:**

1. Increase the log level (INFO → WARNING).
2. Disable file logging if you do not need it.
3. Remove debug statements that you do not need.

### Missing logs

**Problem:** Some logs are missing.

**Solutions:**

1. Check the logger propagation settings.
2. Make sure that the handlers are attached.
3. Check the log level filters.
4. Check the queue listener status.

### Performance issues

**Problem:** Logging causes performance problems.

**Solutions:**

1. Decrease the log output with a higher log level.
2. Disable file logging.
3. Check how often the code logs a message.
4. Check the queue sizes.

## Related documentation

- [Execution architecture](https://optics-framework.org/docs/contribute/execution): the execution tracer and strategy attempt logging.
- [Error handling](https://optics-framework.org/docs/contribute/errors): error logging patterns.
- [Configuration](https://optics-framework.org/docs/reference/config#logging): logging configuration options.
- [Components](https://optics-framework.org/docs/contribute/components): component logging usage.
- [Architecture decisions](https://optics-framework.org/docs/contribute/decisions): logging system design decisions.
