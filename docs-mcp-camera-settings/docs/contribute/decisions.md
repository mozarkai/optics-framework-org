# Architecture decisions

> The main design choices in Optics, why we made them, what we rejected and what each choice costs.

This page holds the Architecture Decision Records (ADRs) of Optics: the key architectural decisions. Each record gives the reason for the decision, the alternatives that we examined and the trade-offs. Read it to understand why Optics has its current design, and before you propose a change to that design.

## What are ADRs?

An Architecture Decision Record (ADR) records one important architectural decision. Each ADR gives:

- **Context**: the situation and the requirements.
- **Decision**: what we decided.
- **Rationale**: why we decided it.
- **Alternatives**: the other options that we examined.
- **Consequences**: the effect and the trade-offs.

## ADR format

Each ADR has this structure:

```markdown
## ADR-XXX: [Title]

**Status:** [Proposed | Accepted | Deprecated | Superseded]

**Context:**
[The situation and requirements]

**Decision:**
[What was decided]

**Rationale:**
[Why this decision was made]

**Alternatives Considered:**
[Other options that were evaluated]

**Consequences:**
[Positive and negative impacts]
```

## Key architectural decisions

The 15 ADRs below are in the sequence that we recorded them. Each status line also tells you if the decision is still true for the current code. The **Implementation** blocks show the code at the time of the decision.

## ADR-001: Linked List Structure for Test Execution Hierarchy

**Status:** Accepted. Still true: the node classes are in `optics_framework/common/models.py`.

**Context:** Optics must show the test execution hierarchy (TestSuite → TestCase → Module → Keyword) in a structure that supports:

- Sequential execution
- Dynamic modification
- State tracking per node
- Memory efficiency

**Decision:** Use a linked list structure with node classes (`TestCaseNode`, `ModuleNode`, `KeywordNode`) instead of nested lists or trees.

**Rationale:**

1. **Sequential execution**: a linked list is a natural fit for a sequential execution flow.
2. **Memory efficiency**: no array overhead. Each node keeps only the necessary links.
3. **Dynamic structure**: you can add and remove nodes during execution.
4. **State tracking**: each node can track its own execution state independently.
5. **Traversal simplicity**: a simple forward traversal is the same as the execution flow.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Nested lists or dictionaries | Simple structure, easy to serialize | Less memory efficient, harder to modify during execution | Does not support dynamic modification well |
| Tree structure | Hierarchical representation | More complex, overhead for parent and child relationships | Too much for sequential execution |
| Array or list with indices | Simple indexing | Reallocation overhead, less flexible | Does not support a dynamic structure well |

**Consequences:**

- Gain: efficient sequential execution.
- Gain: low memory overhead.
- Gain: the structure is easy to modify.
- Gain: natural state tracking.
- Cost: no random access. You must traverse the list.
- Cost: serialization is more complex, if you need it.

**Implementation:**

```python
class TestCaseNode(Node):
    modules_head: Optional[ModuleNode] = None
    next: Optional['TestCaseNode'] = None
```

## ADR-002: Factory Pattern with Dynamic Discovery

**Status:** Accepted. Still true: `GenericFactory` is in `optics_framework/common/base_factory.py`.

**Context:** Optics must support many drivers, element sources and vision models. You must be able to add one without a change to the core code. Optics must find each component and make an instance of it from the configuration.

**Decision:** Use a factory pattern with dynamic module discovery and automatic registration. The factories scan the package directories, find the implementations and make instances of them from the configuration.

**Rationale:**

1. **Extensibility**: you can add new engines without a change to the core code.
2. **Automatic discovery**: no manual registration.
3. **Interface-based**: Optics finds a component by the interface that it implements.
4. **Configuration-driven**: the configuration selects the component, not the code.
5. **Lazy loading**: Optics loads a module only when it needs it.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Manual registration | Explicit control, no discovery overhead | Each new engine needs a code change | Less extensible |
| Plugin system | Standard plugin architecture | More complex, needs plugin infrastructure | Too much for current needs |
| Dependency injection container | Standard DI pattern | More complex, needs container setup | Too heavyweight |

**Consequences:**

- Gain: highly extensible.
- Gain: no code changes for new engines.
- Gain: automatic discovery.
- Gain: interface-based selection.
- Cost: discovery overhead on first use.
- Cost: the naming conventions must be consistent.

**Implementation:**

```python
class GenericFactory:
    @classmethod
    def register_package(cls, package: str) -> None:
        # Recursively discover modules
        # Register module paths
```

## ADR-003: Strategy Pattern for Element Location

**Status:** Accepted. Still true. The current `StrategyManager.locate` in `optics_framework/common/strategies.py` also takes the AOI values (`aoi_x`, `aoi_y`, `aoi_width`, `aoi_height`). When no strategy finds the element, it raises an `E0201` error.

**Context:** Optics can find an element in many ways: XPath, text, OCR and image matching. Optics must try the strategies automatically until one of them is successful (self-healing).

**Decision:** Use the Strategy pattern with a `StrategyManager` that tries the location strategies in priority order until one is successful.

**Rationale:**

1. **Self-healing**: automatic fallback to other methods.
2. **Flexibility**: you can add new location strategies easily.
3. **Priority-based**: Optics tries the fastest strategies first.
4. **Separation of concerns**: each strategy is independent.
5. **Extensibility**: you can add new strategies easily.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Single method with internal fallback | Simpler implementation | Harder to extend, less flexible | Not extensible enough |
| Chain of Responsibility | Standard pattern for fallback | More complex, less explicit | The Strategy pattern is clearer |
| Template Method | Code reuse | Less flexible, harder to extend | Does not support many independent strategies well |

**Consequences:**

- Gain: self-healing test automation.
- Gain: new strategies are easy to add.
- Gain: a clear priority order.
- Gain: independent strategy implementations.
- Cost: many strategy attempts can be slower.
- Cost: the strategies need coordination.

**Implementation:**

```python
class StrategyManager:
    def locate(self, element: str, index: int = 0):
        for strategy in self.locator_strategies:
            try:
                result = strategy.locate(element, index)
                if result is not None:
                    yield LocateResult(result, strategy)
            except Exception:
                continue
```

## ADR-004: Fallback Parameter System

**Status:** Accepted. Still true, with limits that we added later. The shared ladder is now `run` in `optics_framework/common/fallback.py`. The test runner, `optics live`, `optics serve` and the `@fallback_params` decorator of the Python API (`optics_framework/optics.py`) all use it. It tries the combinations in order, but not more than 20 (`MAX_ATTEMPTS`). It goes to the next combination only when the error is "element not found" (a code that starts with `E02`, or `X0201`). Any other error stops the keyword. It keeps only the last 5 failures (`KEPT_FAILURES`), not the errors of all attempts.

**Context:** Keywords must accept more than one fallback value for a parameter, for example more than one element identifier. The fallback must be automatic and transparent to users.

**Decision:** Add a `@fallback_params` decorator that automatically tries the combinations of fallback parameter values until one is successful.

**Rationale:**

1. **User-friendly**: a simple API with automatic fallback.
2. **Flexible**: supports more than one fallback parameter.
3. **Transparent**: works automatically, with no action from the user.
4. **Error aggregation**: collects the errors from the attempts.
5. **Type-safe**: uses type hints to find the fallback parameters.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Manual fallback in keywords | Explicit control | Code duplication, error-prone | Too much boilerplate |
| Separate fallback keyword | Explicit fallback | More verbose, less intuitive | Not user-friendly |
| Configuration-based fallback | Centralized configuration | Less flexible, harder to use | Too rigid |

**Consequences:**

- Gain: a simple API for users.
- Gain: automatic fallback.
- Gain: supports more than one fallback parameter.
- Gain: error aggregation for debugging.
- Cost: exponential growth with many fallback parameters. The 20-attempt limit now puts a ceiling on this.
- Cost: Optics can try many combinations.

**Implementation:**

```python
@fallback_params
def press_element(self, element: fallback_str, ...):
    # Automatically tries all combinations
```

## ADR-005: Queue-Based Logging System

**Status:** Accepted. Still true: see `optics_framework/common/logging_config.py`.

**Context:** Logging must be thread-safe and non-blocking. It must support more than one logger instance (internal and execution). Logging must not make test execution slower.

**Decision:** Use queue-based logging with `QueueHandler` and background listeners. Use separate loggers for internal operations and for execution events.

**Rationale:**

1. **Thread-safe**: queues are thread-safe by design.
2. **Non-blocking**: a log write does not block execution.
3. **Background processing**: Optics processes the logs asynchronously.
4. **Separation of concerns**: different loggers for different purposes.
5. **Performance**: logging does not make execution slower.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Direct logging | Simple, immediate | Blocking, can make execution slower | Performance effect |
| File-based only | Simple | No console output, harder to debug | Development needs console output |
| Single logger | Simpler | Cannot separate internal and execution logs | The logs must be separate for clarity |

**Consequences:**

- Gain: non-blocking execution.
- Gain: thread-safe logging.
- Gain: better performance.
- Gain: separate log streams.
- Cost: a more complex implementation.
- Cost: queue management overhead.

**Implementation:**

```python
execution_queue_handler = QueueHandler(self.execution_log_queue)
self.execution_logger.addHandler(self.execution_queue_handler)
```

## ADR-006: Instance Caching in Factories

**Status:** Accepted. Still true. To clear the cache, call `GenericFactory.clear_instances()` in `optics_framework/common/base_factory.py`.

**Context:** It can be expensive to make a factory instance. Optics can ask for the same component many times. We must balance performance and memory use.

**Decision:** Cache the factory instances by module name. If a cached instance is available, return it. If not, make a new instance and cache it.

**Rationale:**

1. **Performance**: less instantiation overhead.
2. **Singleton behavior**: one instance for each module name.
3. **Memory efficiency**: Optics uses an instance again and does not make duplicates.
4. **Simple**: easy to implement and to understand.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| No caching | Simple, always fresh instances | Performance overhead, possible duplicates | Too slow for repeated access |
| Weak reference caching | Automatic cleanup | More complex, the garbage collector can remove instances | Too complex for current needs |
| LRU cache | Bounded memory use | More complex, can remove instances that Optics needs | Too much, the instances must stay |

**Consequences:**

- Gain: faster instantiation after the first use.
- Gain: singleton behavior for each module.
- Gain: less memory allocation.
- Cost: the instances stay in memory.
- Cost: you must clear the cache manually.

**Implementation:**

```python
if name in cls._registry.instances:
    return cls._registry.instances[name]
# Create and cache
```

## ADR-007: Context Variables for Test Context

**Status:** Accepted. Still true: see `optics_framework/common/test_context.py`. Optics now needs Python 3.12 or later, so the Python 3.7 cost below no longer has an effect.

**Context:** Components need the name of the current test case, but without an explicit parameter. This must work across async operations and threads.

**Decision:** Use the Python `contextvars` module to give a thread-local and async-safe test context.

**Rationale:**

1. **Async-safe**: Python propagates the context to async tasks automatically.
2. **Thread-safe**: each thread has its own context.
3. **No parameter passing**: components get the context without explicit parameters.
4. **Standard library**: uses a standard Python feature.
5. **Isolation**: each execution context has its own isolated context.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Thread-local storage | Simple | Not async-safe, does not propagate to async tasks | Does not work with async |
| Explicit parameter passing | Explicit, clear | Verbose, pollutes method signatures | Too verbose |
| Global variable | Simple access | Not thread-safe, race conditions | Not safe for concurrent execution |

**Consequences:**

- Gain: async-safe context propagation.
- Gain: thread-safe.
- Gain: a clean API with no parameter passing.
- Gain: a standard library solution.
- Cost: needs Python 3.7 or later.
- Cost: you must set the context explicitly.

**Implementation:**

```python
from contextvars import ContextVar
current_test_case: ContextVar[str] = ContextVar("current_test_case", default=None)
```

## ADR-008: Self-Healing Decorator Pattern

**Status:** Accepted, but no longer true. The `@with_self_healing` decorator is not in the code now. Each keyword that locates an element calls the shared method `ActionKeyword._locate_and_act` in `optics_framework/api/action_keyword.py`. The keyword gives it an `act` callback. The method locates the element through the strategies, saves the screenshots, calls `act` on each result until one is successful, and then tries AI self-heal or raises the error. The separation of location from action is the same, but it uses a method and a callback, not a decorator.

**Context:** Action keywords need automatic element location with fallback strategies. This must be transparent to the keyword implementations, and it must handle errors correctly.

**Decision:** Use a `@with_self_healing` decorator that wraps the action methods. It gives automatic element location, strategy fallback and error handling.

**Rationale:**

1. **Separation of concerns**: the location logic is separate from the action logic.
2. **Reusability**: the same decorator for all action methods.
3. **Transparency**: keyword implementations do not need location logic.
4. **Error handling**: centralized error handling and aggregation.
5. **Screenshot management**: automatic screenshot capture and save.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Location in each keyword | Explicit control | Code duplication, error-prone | Too much duplication |
| Base class with location | Code reuse | Inheritance complexity, less flexible | A decorator is more flexible |
| Separate location service | Explicit service | More verbose, needs manual calls | A decorator is cleaner |

**Consequences:**

- Gain: clean keyword implementations.
- Gain: reusable location logic.
- Gain: automatic error handling.
- Gain: screenshot management.
- Cost: decorator complexity.
- Cost: can hide location failures.

**Implementation:**

```python
@with_self_healing
def press_element(self, element: str, ..., *, located: Any = None):
    # located parameter provided by decorator
```

## ADR-009: Percentage-Based AOI Coordinates

**Status:** Accepted. Still true: `calculate_aoi_bounds` is in `optics_framework/common/utils.py`. It also refuses values that are not numbers, values that are not between 0 and 100, and an AOI that goes past the right or bottom edge of the screen (`ValueError`).

**Context:** The Area of Interest (AOI) must work on different screen sizes and resolutions. Absolute pixel coordinates do not work across devices.

**Decision:** Use percentage-based coordinates (0-100) for the AOI parameters. Convert them to pixel coordinates from the screenshot dimensions.

**Rationale:**

1. **Screen-size agnostic**: works on all screen sizes.
2. **Device independent**: the same percentages work on different devices.
3. **Intuitive**: easy to understand (50% is half of the screen).
4. **Flexible**: supports all screen resolutions.
5. **Portable**: test cases work across devices.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Absolute pixel coordinates | Precise control | Device-specific, does not scale | Not portable |
| Normalized coordinates (0-1) | Standard normalization | Less intuitive than percentages | Percentages are more intuitive |
| Relative coordinates | Relative to an element | More complex, needs a reference element | Too complex |

**Consequences:**

- Gain: works on all screen sizes.
- Gain: device-independent.
- Gain: intuitive percentage values.
- Gain: portable tests.
- Cost: less precise than pixels.
- Cost: conversion overhead.

**Implementation:**

```python
def calculate_aoi_bounds(screenshot_shape, aoi_x, aoi_y, aoi_width, aoi_height):
    # Convert percentages to pixels
    x1 = int(width * (aoi_x / 100))
    y1 = int(height * (aoi_y / 100))
```

## ADR-010: Screenshot Streaming with Deduplication

**Status:** Superseded. Assertions now poll every strategy in one loop and share one screenshot per round between the vision strategies. The `ScreenshotStream` class is not in the code now. SSIM stays only in `detect_change` in `optics_framework/common/utils.py`, which finds screen transitions with a threshold of 0.95.

**Context:** Element location with a timeout needs continuous screenshot capture. Optics must not process duplicate frames, and it must manage memory efficiently.

**Decision:** Use queue-based screenshot streaming with SSIM-based deduplication. Capture the screenshots in a background thread, remove duplicates with structural similarity, and keep the result in a filtered queue.

**Rationale:**

1. **Non-blocking**: capture does not block execution.
2. **Deduplication**: Optics processes fewer similar frames.
3. **Memory management**: bounded queues prevent memory problems.
4. **Efficiency**: Optics processes only unique frames.
5. **Background processing**: does not make execution slower.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| No deduplication | Simple | Processes many duplicate frames | Too inefficient |
| Hash-based deduplication | Fast comparison | Does not handle minor variations | SSIM is more robust |
| Fixed interval capture | Predictable | Can miss changes, inefficient | Less efficient than streaming |

**Consequences:**

- Gain: efficient frame processing.
- Gain: non-blocking capture.
- Gain: bounded memory.
- Gain: handles screen changes.
- Cost: SSIM computation overhead.
- Cost: queue management complexity.

**Implementation:**

```python
class ScreenshotStream:
    def process_screenshot_queue(self):
        similarity = ssim(gray_last_frame, gray_frame)
        if similarity >= 0.75:
            # Skip duplicate
```

## ADR-011: Multiple Logger Instances

**Status:** Accepted. Still true: both loggers are in `optics_framework/common/logging_config.py`.

**Context:** Optics must keep the internal debug logs separate from the execution event logs. Different purposes need different log levels and formats.

**Decision:** Use two separate logger instances: `internal_logger` for framework operations and `execution_logger` for test execution events.

**Rationale:**

1. **Separation of concerns**: different logs for different purposes.
2. **Different formats**: internal logs can be more verbose.
3. **Different levels**: you can set a different log level for each.
4. **User experience**: execution logs are for the user.
5. **Debugging**: internal logs help to debug the framework.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Single logger | Simpler | Cannot separate concerns, mixed output | The logs must be separate |
| Logger hierarchy | Standard logging hierarchy | More complex, propagation problems | Two loggers are sufficient |
| Custom logging system | Full control | More complex, reinvents the wheel | Standard logging is better |

**Consequences:**

- Gain: clear separation of logs.
- Gain: different formats and levels.
- Gain: better user experience.
- Gain: easier debugging.
- Cost: more complex configuration.
- Cost: two loggers to manage.

**Implementation:**

```python
internal_logger = logging.getLogger("optics.internal")
execution_logger = logging.getLogger("optics.execution")
```

## ADR-012: InstanceFallback Wrapper

**Status:** Accepted. Still true: see `optics_framework/common/base_factory.py`. `InstanceFallback` is now a pydantic model. It records the instance in use as `current_instance`, and when all instances fail, it raises the last error. `routed_to` sends the calls in a block to one instance only.

**Context:** When you configure more than one driver or element source, Optics must try each one automatically until one is successful. This gives resilience and fallback.

**Decision:** Wrap the instances in an `InstanceFallback` class. On each method call, it tries each instance automatically until one is successful.

**Rationale:**

1. **Automatic fallback**: no manual fallback logic.
2. **Transparent**: works like a single instance.
3. **Resilient**: continues to work if one instance fails.
4. **Simple API**: users do not handle fallback.
5. **Flexible**: supports any number of instances.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Manual fallback in code | Explicit control | Code duplication, error-prone | Too much boilerplate |
| Proxy pattern | Standard pattern | More complex, less transparent | `InstanceFallback` is simpler |
| Configuration-based selection | Explicit selection | No automatic fallback | Automatic fallback is necessary |

**Consequences:**

- Gain: automatic fallback.
- Gain: transparent use.
- Gain: resilient to failures.
- Gain: simple API.
- Cost: can hide failures.
- Cost: performance effect with many instances.

**Implementation:**

```python
class InstanceFallback:
    def __getattr__(self, attr):
        for instance in self.instances:
            try:
                return getattr(instance, attr)(*args, **kwargs)
            except Exception:
                continue
```

## ADR-013: YAML and CSV Dual Format Support

**Status:** Accepted. Still true: the readers are in `optics_framework/common/runner/data_reader.py`, and `identify_file_content` in `optics_framework/helper/execute.py` finds the file type from the CSV headers or the YAML keys. Each reader now has the signature `read_test_cases(self, file_path: str) -> dict`.

**Context:** Users prefer different formats for test data. Some prefer CSV because it works in a spreadsheet. Others prefer YAML because it has more structure. Optics must support both.

**Decision:** Support both CSV and YAML for test cases, modules and elements. Use content-based file discovery to identify the file types.

**Rationale:**

1. **User choice**: supports different user preferences.
2. **Flexibility**: users can select the best format for their needs.
3. **Content-based**: Optics identifies a file by its content, not only by its extension.
4. **Merging**: Optics merges many files of the same type.
5. **Backward compatible**: supports existing CSV-based projects.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| CSV only | Simpler, one format | Less flexible, harder for complex data | Too limiting |
| YAML only | More structure, better for complex data | Less spreadsheet-friendly | CSV is important for many users |
| JSON support | Standard format | Less human-readable, one more format to support | YAML is more readable |

**Consequences:**

- Gain: flexible format choice.
- Gain: content-based discovery.
- Gain: file merging.
- Gain: backward compatible.
- Cost: more complex file reading.
- Cost: two formats to maintain.

**Implementation:**

```python
class CSVDataReader(DataReader):
    def read_test_cases(self, source: str) -> TestCases:
        # Read CSV

class YAMLDataReader(DataReader):
    def read_test_cases(self, source: str) -> TestCases:
        # Read YAML
```

## ADR-014: Session-Based Architecture

**Status:** Accepted. Still true: see `optics_framework/common/session_manager.py`. `SessionManager.create_session` now takes the configuration, test cases, modules, elements, APIs, templates and error definitions. It makes the ID with `uuid.uuid4()`.

**Context:** Optics must support many concurrent test executions. Each execution has its own configuration, state and resources, and the executions must be isolated.

**Decision:** Use a session-based architecture. Each test execution has its own session with isolated configuration, drivers and state.

**Rationale:**

1. **Isolation**: each session is independent.
2. **Concurrency**: supports many concurrent executions.
3. **Resource management**: a clear lifecycle for resources.
4. **Configuration**: configuration for each session.
5. **State management**: session-scoped state.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Global state | Simpler | No isolation, race conditions | Not safe for concurrent execution |
| Thread-local storage | Automatic isolation | Not async-safe, less explicit | Sessions are more explicit |
| Context manager | Automatic cleanup | Less flexible, harder to share | Sessions need more flexibility |

**Consequences:**

- Gain: session isolation.
- Gain: support for concurrent execution.
- Gain: a clear resource lifecycle.
- Gain: configuration for each session.
- Cost: session management overhead.
- Cost: you must pass the `session_id`.

**Implementation:**

```python
class SessionManager:
    def create_session(self, config, ...) -> str:
        session_id = str(uuid4())
        session = Session(session_id, config, ...)
        self.sessions[session_id] = session
        return session_id
```

## ADR-015: Builder Pattern for Component Construction

**Status:** Accepted. Still true: `OpticsBuilder` is in `optics_framework/common/optics_builder.py`.

**Context:** Optics must build complex component hierarchies with correct dependency injection. The components depend on each other. For example, element sources need drivers.

**Decision:** Use the Builder pattern (`OpticsBuilder`) to build the component hierarchies with automatic dependency injection.

**Rationale:**

1. **Complex construction**: handles complex component setup.
2. **Dependency injection**: injects the dependencies automatically.
3. **Fluent API**: method chaining for readability.
4. **Validation**: can validate the configuration during construction.
5. **Flexibility**: supports different component combinations.

**Alternatives considered:**

| Alternative | Pros | Cons | Why we rejected it |
|---|---|---|---|
| Direct instantiation | Simple, explicit | Manual dependency management, error-prone | Too error-prone |
| Factory methods | Encapsulates creation | Less flexible, harder to extend | A builder is more flexible |
| Dependency injection container | Standard DI pattern | More complex, needs a container | A builder is simpler for this use case |

**Consequences:**

- Gain: handles complex construction.
- Gain: automatic dependency injection.
- Gain: fluent API.
- Gain: configuration validation.
- Cost: more complex than direct instantiation.
- Cost: builder state management.

**Implementation:**

```python
builder = OpticsBuilder(session)
builder.add_driver(config)
builder.add_element_source(config)
driver = builder.get_driver()
```

## Historical context

### Framework evolution

Optics went through these main phases:

1. **Phase 1: Initial design (early development)**
   - Focus on basic automation capabilities
   - Single driver support (Appium)
   - Simple element location (XPath only)
   - CSV-based test cases
2. **Phase 2: Vision integration**
   - OCR and image matching capabilities
   - Multiple location strategies
   - Self-healing mechanism
   - Template-based image location
3. **Phase 3: Extensibility**
   - Factory pattern for dynamic discovery
   - Multiple driver support
   - Plugin architecture for engines
   - Strategy pattern for location
4. **Phase 4: API and CLI**
   - REST API layer
   - CLI interface
   - Session management
   - Event system
5. **Phase 5: Advanced features**
   - Fallback parameters
   - AOI support
   - Screenshot streaming
   - Performance optimizations

### Design principles evolution

The early principles were:

- Simplicity
- Ease of use
- CSV-based (no code)

The current principles are:

- Modularity
- Extensibility
- Resilience (self-healing)
- More focus on performance
- Separation of concerns

### Key design influences

1. **Robot Framework**: the keyword-based approach and the library pattern.
2. **Selenium and Appium**: driver abstraction and element location.
3. **Factory pattern**: dynamic component creation.
4. **Strategy pattern**: many location methods.
5. **Builder pattern**: construction of complex objects.

### Breaking changes and migrations

None are recorded yet. The framework is still in active development.

Future ADRs must record:

- Breaking changes
- Migration guides
- Deprecation notices
- Version compatibility

## Contributing ADRs

When you make a significant architectural decision, do these steps:

1. **Create an ADR**: record the decision in the ADR format.
2. **Number it in sequence**: use the ADR-XXX format.
3. **Update this page**: add the ADR to the list above.
4. **Review**: get a team review before you implement it.
5. **Track the status**: update the status when the decision changes.

## ADR status values

| Status | Meaning |
|---|---|
| Proposed | The decision is under consideration. |
| Accepted | We made the decision and implemented it. |
| Deprecated | A newer ADR replaced the decision. |
| Superseded | ADR-XXX replaced the decision. |

## Related documentation

- [Architecture overview](https://optics-framework.org/docs/contribute/architecture): the high-level architecture.
- [Components](https://optics-framework.org/docs/contribute/components): the component implementations.
- [Strategies](https://optics-framework.org/docs/contribute/strategies): the implementation of the Strategy pattern.
- [Execution](https://optics-framework.org/docs/contribute/execution): the execution architecture.
- [Extending](https://optics-framework.org/docs/contribute/extending): how to extend Optics.
