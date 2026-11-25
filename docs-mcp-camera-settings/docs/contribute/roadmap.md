# Help wanted

> The open areas of Optics where a contribution helps, with the current state, the goal and the files to change for each.

This page lists the areas where Optics needs help. Each area gives the current state, the goal, the implementation details and the priority. Some areas suit a first contribution. Others need deep knowledge of the framework. Parts that current code already does are marked **Done**, with the file that does it.

**Open issues:**
Today, one issue has the `help wanted` label: [#364, introduce fuzzy testing](https://github.com/mozarkai/optics-framework/issues/364). None of the areas on this page has that label. Search the [open issues](https://github.com/mozarkai/optics-framework/issues) before you start, because some of this work may already have an issue.

## Propose work

1. Read the area on this page, and the code it names.
2. Search the open issues. If an issue for the work exists, add your plan to it.
3. If there is no issue, [open one](https://github.com/mozarkai/optics-framework/issues/new?template=feature_request.yml) with the feature request form. Say which area and which item you want to work on, and how you plan to do it.
4. Set up your environment with [Set up for development](https://optics-framework.org/docs/contribute/setup), then follow the steps in [Making your contribution](#making-your-contribution).

A typo or a small fix needs no issue. For a bigger change, open the issue first. You can open a draft pull request at any time to ask for direction.

## Priority and difficulty levels

Each area has a priority and a difficulty.

| Level | Meaning |
| --- | --- |
| **High Priority** | Critical for production use or security |
| **Medium Priority** | Important for usability and completeness |
| **Low Priority** | Nice to have improvements |
| **Beginner** | Good first contribution, minimal framework knowledge needed |
| **Intermediate** | Requires some framework knowledge |
| **Advanced** | Requires deep framework understanding |

## The areas

| Area | Priority | Difficulty | Status |
| --- | --- | --- | --- |
| [1. Stateless API layer](#1-stateless-api-layer) | High | Advanced | Open |
| [2. Parallel strategy execution](#2-parallel-strategy-execution) | High | Advanced | Open |
| [3. Flexible driver-specific strategies](#3-flexible-driver-specific-strategies) | High | Intermediate | Partly done |
| [4. Additional image detection drivers](#4-additional-image-detection-drivers) | Medium | Intermediate to Advanced | Open |
| [5. Interactive test creation](#5-interactive-test-creation) | Medium | Advanced | Partly done |
| [6. Code simplification and unification](#6-code-simplification-unification) | Medium | Intermediate | Partly done |
| [7. Test coverage](#7-test-coverage) | High | Beginner to Intermediate | Partly done |
| [8. Security improvements](#8-security-improvements) | High | Intermediate | Partly done |
| [9. Feature development](#9-feature-development) | Medium to High | Intermediate to Advanced | Partly done |
| [10. Performance optimizations](#10-performance-optimizations) | Medium | Intermediate | Partly done |
| [11. Documentation](#11-documentation) | Medium | Beginner to Intermediate | Partly done |
| [12. Infrastructure](#12-infrastructure) | Low to Medium | Intermediate | Partly done |

## 1. Stateless API layer

**Priority**: High | **Difficulty**: Advanced | **Status**: Open

### Current state

The API layer keeps its state in `SessionManager`, which stores sessions in memory (`self.sessions` in `optics_framework/common/session_manager.py`). You cannot move a session from one instance to another. This makes it difficult to scale horizontally or to recover from an instance failure. When a driver session drops, Optics does not reconnect: you must stop the session and start a new one (`optics_framework/common/session_liveness.py`).

### Goal

Make the API layer stateless, so that you can move a session from one instance to another and keep its context. This enables:

- Horizontal scaling of API instances
- Session recovery after instance failures
- Load balancing across multiple instances
- Zero-downtime deployments

### Key areas

#### Session storage

**Current**: Sessions stored in-memory only (`optics_framework/common/session_manager.py`)

**Needed**:

- External session storage (database, Redis, etc.)
- Session serialization/deserialization
- Session state export/import functionality

#### Session context

**Current**: Session contains driver instances, element sources, vision models that cannot be serialized

**Needed**:

- Serialize all session state (configuration, driver state, element sources, vision models)
- Reconstruct session from serialized state
- Handle driver reconnection on migration
- Store driver session IDs and connection details

#### API endpoints

**New Endpoints Needed**:

- `POST /v1/sessions/{id}/export` - Export session state as JSON
- `POST /v1/sessions/import` - Import session state and recreate session
- `POST /v1/sessions/{id}/migrate` - Migrate session to another instance

None of these endpoints exists yet. The session endpoints today are listed in the [HTTP API reference](https://optics-framework.org/docs/reference/http-api).

### Files to modify

- `optics_framework/common/session_manager.py` - Add serialization support
- `optics_framework/common/expose_api.py` - Add migration endpoints
- `optics_framework/common/models.py` - Add session state models (Pydantic)
- `optics_framework/common/optics_builder.py` - Support session reconstruction

### Related documentation

- [Session Management](https://optics-framework.org/docs/contribute/components#sessionmanager)
- [REST API Layer](https://optics-framework.org/docs/contribute/api-layer)

## 2. Parallel strategy execution

**Priority**: High | **Difficulty**: Advanced | **Status**: Open

### Current state

Strategies run **sequentially** (one after another) in a fallback chain. `StrategyManager.locate()` in `optics_framework/common/strategies.py` is a generator that tries Strategy 1, waits for it to finish (success or failure), then tries Strategy 2, and so on. This is reliable, but slower than necessary, because:

1. **Independent strategies wait unnecessarily**: Many strategies can run simultaneously since they don't depend on each other
2. **Total execution time is sum of all strategies**: If Strategy 1 takes 2s and Strategy 2 takes 3s, total time is 5s even if Strategy 2 could succeed immediately
3. **Resource underutilization**: CPU, I/O, and network resources are idle while waiting for sequential execution

**Example of Current Sequential Flow**:

```python
# Current: Sequential execution
1. Try XPathStrategy.find_element() → Wait 2s → Fail
2. Try TextElementStrategy.find_element() → Wait 1s → Fail
3. Try TextDetectionStrategy.find_element() → Wait 3s → Success
# Total time: 6 seconds
```

### Goal

Run independent strategies at the same time. This cuts the time to locate an element, and keeps the same reliability and fallback behaviour.

**Benefits**:

- **Faster element location**: Strategies execute concurrently, returning the first successful result
- **Better resource utilization**: CPU, I/O, and network resources used efficiently
- **Faster tests**: Tests execute faster, especially with multiple fallback strategies
- **Maintains reliability**: Still supports fallback, but optimizes for the common case

**Example of Desired Parallel Flow**:

```python
# Desired: Parallel execution
1. Start XPathStrategy.find_element() → (runs in background)
2. Start TextElementStrategy.find_element() → (runs in background)
3. Start TextDetectionStrategy.find_element() → (runs in background)
4. First successful result returns → Total time: ~3 seconds (longest strategy)
```

### Execution semantics

**Critical Requirement**: Only one strategy should execute the final keyword/action. Once a strategy successfully performs the keyword, all remaining strategies must be immediately aborted.

**Execution Rules**:

1. **Parallel Location Phase**: Multiple strategies run in parallel to locate the element
   - All strategies attempt to find the element simultaneously
   - First successful location result is selected
   - Remaining location attempts are cancelled/aborted
2. **Single Action Execution**: Only the winning strategy executes the keyword/action
   - The strategy that successfully located the element proceeds to execute the action
   - Other strategies are aborted before they can execute any actions
   - This prevents duplicate actions (e.g., clicking the same button twice)
3. **Fallback Behavior**: If the selected strategy fails to execute the keyword
   - Abort the failed strategy
   - Move to the next successful location result (if available)
   - If no other strategies succeeded in location, try the next strategy in sequence

**Example Flow**:

```python
# Parallel location phase
strategy1_result = await XPathStrategy.locate(element)      # Success: found element
strategy2_result = await TextStrategy.locate(element)      # Success: found element
strategy3_result = await OCRStrategy.locate(element)       # Still running...

# Strategy 1 wins (first success)
if strategy1_result:
    # Abort strategy 2 and 3 immediately
    abort_strategy(strategy2)
    abort_strategy(strategy3)

    # Only strategy 1 executes the keyword
    try:
        await strategy1.execute_keyword("press_element", strategy1_result)
        return success  # Done! No other strategies execute
    except Exception:
        # Strategy 1 failed to execute, try strategy 2
        abort_strategy(strategy1)
        await strategy2.execute_keyword("press_element", strategy2_result)
        return success
```

**Implementation Requirements**:

- **Cancellation Tokens**: Use `asyncio.CancelledError` or cancellation tokens to abort strategies
- **Early Exit**: Return immediately when first strategy succeeds
- **Resource Cleanup**: Properly clean up aborted strategies (close connections, release locks)
- **Error Handling**: Handle cancellation gracefully without side effects

### Key scenarios

#### Scenario 1: XPath with parallel coordinate discovery

**Current Behavior**: When given an XPath, the framework:

1. Tries `find_element()` using the XPath directly
2. If that fails, tries other strategies sequentially

**Desired Parallel Behavior**: When given an XPath, simultaneously:

1. **Primary path**: Execute `find_element()` using the XPath directly
2. **Parallel path**: Search page source to find the XPath and extract coordinates
3. **Fallback path**: If XPath is not accessible, use coordinates from page source

**Implementation Flow**:

```python
# Parallel execution
async def locate_with_xpath(element: str):
    tasks = [
        # Task 1: Direct findElement
        find_element_direct(element),

        # Task 2: Parse page source for XPath and get coordinates
        parse_page_source_for_coordinates(element),

        # Task 3: Alternative XPath variations
        try_xpath_variations(element)
    ]

    # Return first successful result
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return first_successful_result(results)
```

#### Scenario 2: Text with parallel XPath discovery and OCR

**Current Behavior**: When given text, the framework:

1. Tries text-based element location
2. If that fails, tries OCR sequentially
3. If that fails, tries other strategies

**Desired Parallel Behavior**: When given text, simultaneously:

1. **Path A**: Search page source to find text and convert to XPath, then execute `find_element()`
2. **Path B**: Capture screenshot and use OCR/text detection to find coordinates
3. **Path C**: Try direct text matching in element source

**Implementation Flow**:

```python
# Parallel execution for text
async def locate_with_text(text: str):
    tasks = [
        # Task 1: Page source → XPath → findElement
        page_source_to_xpath_to_find_element(text),

        # Task 2: Screenshot → OCR → Coordinates
        screenshot_ocr_to_coordinates(text),

        # Task 3: Direct text element location
        direct_text_element_location(text)
    ]

    # Return first successful result
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return first_successful_result(results)
```

#### Scenario 3: Image template with parallel detection methods

**Current Behavior**: When given an image template, tries image detection strategies sequentially.

**Desired Parallel Behavior**: Simultaneously:

1. Template matching (OpenCV)
2. Remote OIR service
3. Alternative image detection models

### Implementation approach

#### Architecture changes

The four sketches below show the proposed design. They are not current code.

**1. Strategy execution model**
Convert from sequential to parallel execution with abort capability:

```python
# Current: Sequential
class StrategyManager:
    def locate(self, element: str):
        for strategy in self.strategies:
            result = strategy.locate(element)  # Blocks here
            if result:
                return result
        raise ElementNotFoundError()

# Desired: Parallel with abort
class StrategyManager:
    async def locate(self, element: str):
        # Create tasks with cancellation support
        tasks = {
            strategy: asyncio.create_task(strategy.locate_async(element))
            for strategy in self.strategies
        }

        # Wait for first success, then abort others
        for strategy, task in tasks.items():
            try:
                result = await task
                if result:
                    # Abort all remaining tasks
                    for other_strategy, other_task in tasks.items():
                        if other_strategy != strategy and not other_task.done():
                            other_task.cancel()
                    return result
            except asyncio.CancelledError:
                continue

        raise ElementNotFoundError()
```

The "Current" half is simplified. The real `StrategyManager.locate()` takes the element, an optional area of interest and an index, and yields a `LocateResult` for each strategy that finds the element.

**2. Strategy interface updates**
Make strategies async-compatible:

```python
# Current
class LocatorStrategy(ABC):
    def locate(self, element: str, index: int = 0):
        # Synchronous implementation
        pass

# Desired
class LocatorStrategy(ABC):
    async def locate_async(self, element: str, index: int = 0):
        # Asynchronous implementation
        pass

    def locate(self, element: str, index: int = 0):
        # Synchronous wrapper for backward compatibility
        return run_async(self.locate_async(element, index))
```

`run_async()` exists in `optics_framework/common/async_utils.py`. It now also needs a `timeout` argument: `run_async(coro, timeout)`.

**3. Parallel execution groups with abort**
Group strategies that can run in parallel with abort capability:

```python
class ParallelStrategyGroup:
    """Groups strategies that can execute in parallel"""

    def __init__(self, strategies: List[LocatorStrategy]):
        self.strategies = strategies
        self.priority = min(s.priority for s in strategies)

    async def execute_parallel(self, element: str):
        """Execute all strategies in parallel, return first success, abort others"""
        # Create cancellable tasks
        tasks = {
            strategy: asyncio.create_task(strategy.locate_async(element))
            for strategy in self.strategies
        }

        # Wait for first success
        for strategy, task in tasks.items():
            try:
                result = await task
                if result:
                    # Abort all remaining tasks
                    self._abort_remaining(tasks, strategy)
                    return result
            except asyncio.CancelledError:
                continue

        return None

    def _abort_remaining(self, tasks: dict, winner: LocatorStrategy):
        """Cancel all tasks except the winner"""
        for strategy, task in tasks.items():
            if strategy != winner and not task.done():
                task.cancel()
```

**4. Dependency management**
Identify which strategies can run in parallel vs. which must be sequential:

```python
class StrategyDependencyGraph:
    """Manages strategy dependencies and parallel execution"""

    def can_run_parallel(self, strategy1: LocatorStrategy, strategy2: LocatorStrategy) -> bool:
        """Check if two strategies can run in parallel"""
        # Strategies can run in parallel if:
        # 1. They don't modify shared state
        # 2. They don't depend on each other's results
        # 3. They use different resources (e.g., page source vs screenshot)
        return (
            not strategy1.modifies_shared_state() and
            not strategy2.modifies_shared_state() and
            strategy1.resource_type() != strategy2.resource_type()
        )
```

#### Specific implementation patterns

**Pattern 1: XPath with coordinate discovery**
```python
async def locate_xpath_parallel(element: str):
    """Locate element by XPath with parallel coordinate discovery"""

    async def direct_find():
        """Direct findElement using XPath"""
        return await element_source.locate(element)

    async def page_source_coords():
        """Parse page source to find XPath and get coordinates"""
        page_source, _ = await element_source.get_page_source()
        xpath_node = parse_xpath_from_page_source(page_source, element)
        if xpath_node:
            return get_coordinates_from_node(xpath_node)
        return None

    # Execute both in parallel
    results = await asyncio.gather(
        direct_find(),
        page_source_coords(),
        return_exceptions=True
    )

    # Prefer direct find, fallback to coordinates
    if results[0] and not isinstance(results[0], Exception):
        return results[0]
    if results[1] and not isinstance(results[1], Exception):
        return results[1]
    raise ElementNotFoundError()
```

**Pattern 2: Text with multi-path discovery**
```python
async def locate_text_parallel(text: str):
    """Locate element by text with parallel multi-path discovery"""

    async def page_source_path():
        """Page source → Find text → Convert to XPath → findElement"""
        page_source, _ = await element_source.get_page_source()
        xpath = find_text_in_page_source(page_source, text)
        if xpath:
            return await element_source.locate(xpath)
        return None

    async def screenshot_ocr_path():
        """Screenshot → OCR → Find coordinates"""
        screenshot = await element_source.capture()
        text_locations = await text_detection.find_element(screenshot, text)
        if text_locations:
            return text_locations[0]  # Return first match
        return None

    async def direct_text_path():
        """Direct text element location"""
        return await element_source.locate_by_text(text)

    # Execute all three paths in parallel
    results = await asyncio.gather(
        page_source_path(),
        screenshot_ocr_path(),
        direct_text_path(),
        return_exceptions=True
    )

    # Return first successful result
    for result in results:
        if result and not isinstance(result, Exception):
            return result
    raise ElementNotFoundError()
```

**Pattern 3: Resource-aware parallel execution**
```python
class ResourceAwareStrategyExecutor:
    """Executes strategies in parallel while managing resources"""

    def __init__(self):
        self.page_source_lock = asyncio.Lock()
        self.screenshot_lock = asyncio.Lock()
        self.driver_lock = asyncio.Lock()

    async def execute_parallel(self, strategies: List[LocatorStrategy], element: str):
        """Execute strategies in parallel with resource management"""

        # Group strategies by resource type
        page_source_strategies = [s for s in strategies if s.uses_page_source()]
        screenshot_strategies = [s for s in strategies if s.uses_screenshot()]
        driver_strategies = [s for s in strategies if s.uses_driver()]

        # Execute groups in parallel, but serialize within groups if needed
        tasks = []

        if page_source_strategies:
            tasks.append(self._execute_with_lock(
                page_source_strategies, element, self.page_source_lock
            ))

        if screenshot_strategies:
            tasks.append(self._execute_with_lock(
                screenshot_strategies, element, self.screenshot_lock
            ))

        if driver_strategies:
            tasks.append(self._execute_with_lock(
                driver_strategies, element, self.driver_lock
            ))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        return first_successful_result(results)
```

### Key implementation areas

#### 1. Async strategy interface

**Files to Modify**:

- `optics_framework/common/strategies.py` - Add async methods to `LocatorStrategy`
- All strategy implementations - Add `locate_async()` methods

**Changes Needed**:

- Convert `locate()` methods to async
- Maintain backward compatibility with sync wrappers
- Update strategy base class

#### 2. Parallel execution engine

**Files to Create/Modify**:

- `optics_framework/common/parallel_strategy_executor.py` - New parallel executor
- `optics_framework/common/strategies.py` - Update `StrategyManager` for parallel execution

**Features**:

- Parallel task execution using `asyncio.create_task()` and cancellation
- First-success-wins semantics with immediate abort of remaining strategies
- Exception handling and aggregation
- Resource management (locks for shared resources)
- Cancellation token support for graceful abort
- Only winning strategy executes the keyword/action

#### 3. Strategy dependency analysis

**Files to Create**:

- `optics_framework/common/strategy_dependencies.py` - Dependency analysis

**Features**:

- Identify which strategies can run in parallel
- Group strategies by resource requirements
- Manage resource locks (page source, screenshot, driver)

#### 4. Configuration and control

**Files to Modify**:

- `optics_framework/common/config_handler.py` - Add parallel execution config
- `optics_framework/common/models.py` - Add configuration models

**Configuration Options** (proposed; `config.yaml` has no `strategy_execution` key yet):

```yaml
strategy_execution:
  mode: "parallel"  # "sequential" or "parallel"
  max_parallel_strategies: 5
  timeout_per_strategy: 10
  resource_locks:
    page_source: true
    screenshot: true
    driver: false
```

### Performance considerations

#### Expected improvements

- **XPath location**: 40-60% faster (2-3 strategies in parallel)
- **Text location**: 50-70% faster (3-4 strategies in parallel)
- **Image location**: 30-50% faster (2-3 detection methods in parallel)
- **Overall test execution**: 20-40% faster for tests with many element locations

These are estimates. Measure them before and after your change.

#### Resource management

- **CPU**: Better utilization with parallel I/O operations
- **Memory**: Slight increase due to parallel task execution
- **Network**: Better utilization for remote services (OCR, OIR)
- **Driver**: Careful locking to prevent driver conflicts

### Testing requirements

#### Unit tests

- Test parallel execution with mock strategies
- Test first-success-wins behavior
- Test abort/cancellation of remaining strategies when one succeeds
- Test that only one strategy executes the keyword/action
- Test exception handling
- Test resource locking
- Test graceful cancellation cleanup

#### Integration tests

- Test with real drivers and element sources
- Test performance improvements
- Test backward compatibility
- Test configuration options

### Migration path

#### Phase 1: Add async support (non-breaking)

- Add async methods alongside sync methods
- Maintain backward compatibility
- No behavior changes

#### Phase 2: Parallel execution (opt-in)

- Add configuration option for parallel execution
- Default to sequential for safety
- Allow users to opt-in

#### Phase 3: Parallel by default

- Make parallel execution the default
- Keep sequential as fallback option
- Optimize based on real-world usage

### Files to modify

**Core Strategy System**:

- `optics_framework/common/strategies.py` - Add parallel execution support
- `optics_framework/common/execution.py` - Update execution flow

**Strategy Implementations**:

- `optics_framework/common/strategies.py` - Update all strategy classes
- All element source implementations - Add async support

**Configuration**:

- `optics_framework/common/config_handler.py` - Add parallel execution config
- `optics_framework/common/models.py` - Add configuration models

**New Files**:

- `optics_framework/common/parallel_strategy_executor.py` - Parallel executor
- `optics_framework/common/strategy_dependencies.py` - Dependency management

### Related documentation

- [Strategy Pattern](https://optics-framework.org/docs/contribute/strategies)
- [Execution Architecture](https://optics-framework.org/docs/contribute/execution)

### Challenges and considerations

#### Challenge 1: Resource conflicts

**Problem**: Multiple strategies accessing the same resource (driver, page source) simultaneously

**Solution**:

- Use asyncio locks for shared resources
- Group strategies by resource type
- Serialize access to shared resources

#### Challenge 2: Backward compatibility

**Problem**: Existing code expects synchronous strategy execution

**Solution**:

- Maintain sync wrappers for async methods
- Use `run_async()` utility for compatibility
- Gradual migration path

#### Challenge 3: Error handling

**Problem**: Multiple strategies may fail in parallel

**Solution**:

- Aggregate all exceptions
- Return most informative error
- Log all strategy attempts

#### Challenge 4: Performance tuning

**Problem**: Too many parallel tasks may degrade performance

**Solution**:

- Configurable max parallel strategies
- Resource-aware task scheduling
- Monitor and optimize based on metrics

#### Challenge 5: Ensuring single action execution

**Problem**: Multiple strategies might try to execute the same keyword/action

**Solution**:

- Implement strict abort mechanism when first strategy succeeds
- Use cancellation tokens to immediately stop remaining strategies
- Only allow the winning strategy to proceed to action execution
- Add validation to prevent duplicate actions
- Implement proper cleanup for aborted strategies

## 3. Flexible driver-specific strategies

**Priority**: High | **Difficulty**: Intermediate | **Status**: Partly done

### Current state

The locator strategies are generic and work across all drivers. `StrategyFactory` builds them from a fixed list (`self._registry` in `optics_framework/common/strategies.py`): `XPathStrategy`, `TextElementStrategy`, `TextDetectionStrategy` and `ImageDetectionStrategy`. A driver cannot add its own strategy to that list.

Since this item was written, each element source learned to read driver-specific locators inside the existing strategies. The items below say which ones.

### Goal

Let a driver add strategies of its own, so that each driver can use its best features and still keep the fallback mechanism.

### Key areas

#### Playwright-specific strategies

Playwright provides locator methods that the generic strategies did not use:

- `get_by_role()` - Locate by ARIA role (button, textbox, etc.). **Done**: the `role=` prefix, and plain text also tries buttons and links by role.
- `get_by_test_id()` - Locate by test ID attribute. **Done**: the `data-testid=` and `testid=` prefixes.
- `get_by_label()` - Locate by associated label. **Done**: the `label=` prefix.
- `get_by_placeholder()` - Locate by placeholder text. **Done**: the `placeholder=` prefix.
- `get_by_text()` - Locate by visible text. **Done**: the `text=` prefix.
- `get_by_title()` - Locate by title attribute. **Done**: the `title=` prefix.
- `get_by_alt_text()` - Locate by alt text (for images). **Done**: the `alt=` prefix.

Evidence: `optics_framework/engines/drivers/playwright_locator.py`. A plain value such as `Submit` tries text, label, placeholder, button and link, exact matches first.

**Example**:

```python
# Current: Generic text strategy
element = "Submit Button"

# With Playwright role strategy:
element = "role:button[name='Submit']"
```

The `role:` spelling above was the proposal. The shipped syntax uses Playwright's own selector engine: `role=button[name="Submit"]`.

#### Selenium/Playwright CSS strategies

The old state was that only XPath was supported. CSS selectors are faster and easier to read:

- CSS selector support (not just XPath). **Done** for Playwright (`optics_framework/engines/drivers/playwright_locator.py`), Selenium (`optics_framework/engines/drivers/selenium_locator.py`) and Appium web contexts (`optics_framework/engines/elementsources/appium_find_element.py`, `optics_framework/engines/elementsources/appium_web.py`). Use the `css=` prefix, or a value that looks like CSS, such as `#login` or `button.primary`.
- CSS pseudo-selectors (`:first-child`, `:nth-of-type`, etc.). **Done**: they work inside a `css=` value.
- CSS attribute selectors (`[data-testid="submit"]`). **Done**: they work as a `css=` value, and a value with `[...]` is read as CSS.

#### Appium-specific strategies

- UI Automator selectors (Android). Open: you cannot give a UI Automator selector as an element value. Optics uses UI Automator only internally, to measure web views.
- iOS predicate strings. Open.
- Accessibility ID strategies. **Done**: a text value on a native app is looked up by accessibility ID (`optics_framework/engines/elementsources/appium_find_element.py`).
- Class name strategies. **Done**: a value that starts with `android.` or `XCUI` is looked up by class name (`determine_element_type()` in `optics_framework/common/utils.py`).

#### Strategy registration

**Needed** (all open):

- Driver-specific strategy factory
- Strategy priority per driver
- Dynamic strategy discovery mechanism
- Strategy registration API for drivers

### Files to modify

- `optics_framework/common/strategies.py` - Add driver-specific strategy support
- `optics_framework/engines/drivers/playwright.py` - Add Playwright-specific strategies (the locator rules now live in `optics_framework/engines/drivers/playwright_locator.py`)
- `optics_framework/engines/drivers/selenium.py` - Add CSS selector strategies (the locator rules now live in `optics_framework/engines/drivers/selenium_locator.py`)
- `optics_framework/engines/drivers/appium.py` - Add Appium-specific strategies

### Related documentation

- [Strategy Pattern](https://optics-framework.org/docs/contribute/strategies)
- [Extending the Framework](https://optics-framework.org/docs/contribute/extending#creating-new-strategies)

## 4. Additional image detection drivers

**Priority**: Medium | **Difficulty**: Intermediate to Advanced | **Status**: Open

### Current state

Only two image detection models are available:

- **TemplateMatch** (OpenCV-based) - Local template matching. Engine name `templatematch`, class `TemplateMatchingHelper` in `optics_framework/engines/vision_models/image_models/templatematch.py`.
- **RemoteOIR** (Remote service) - Remote object image recognition. Engine name `remote_oir`, class `RemoteImageDetection` in `optics_framework/engines/vision_models/image_models/remote_oir.py`.

### Goal

Add more image detection and vision models. This gives users more options, better accuracy, and other use cases.

### Potential additions

#### YOLO integration

Object detection using YOLO (You Only Look Once) models:

- Real-time object detection
- Pre-trained models for UI elements
- Custom model support

**File to Create**: `optics_framework/engines/vision_models/image_models/yolo.py`

#### Cloud vision services

- **AWS Rekognition**: Amazon's image recognition service
- **Azure Computer Vision**: Microsoft's vision API
- **Google Cloud Vision**: Google's image analysis API (for object detection, not just OCR)

**Files to Create**:

- `optics_framework/engines/vision_models/image_models/aws_rekognition.py`
- `optics_framework/engines/vision_models/image_models/azure_vision.py`
- `optics_framework/engines/vision_models/image_models/google_vision_detection.py`

#### Deep learning models

- **TensorFlow/PyTorch Models**: Support for custom trained models
- Pre-trained models for UI element detection
- Model loading and inference

**File to Create**: `optics_framework/engines/vision_models/image_models/tensorflow_model.py`

#### Advanced OpenCV algorithms

- **ORB** (Oriented FAST and Rotated BRIEF)
- **BRISK** (Binary Robust Invariant Scalable Keypoints)
- **AKAZE** (Accelerated-KAZE)
- Feature matching alternatives to SIFT

### Implementation guidelines

All image detection models must implement the `ImageInterface`:

```python
from optics_framework.common.image_interface import ImageInterface

class YourImageDetection(ImageInterface):
    def element_exist(self, input_data, reference_data):
        # Implementation
        pass

    def find_element(self, input_data, image, index=None):
        # Implementation
        pass

    def assert_elements(self, input_data, elements, rule="any"):
        # Implementation
        pass
```

`element_exist()` returns `(True, (x, y), matches)` or `(False, (None, None), None)`. `find_element()` returns `(found, center, bounds)`, where `bounds` is `((x1, y1), (x2, y2))`, or `None`. The shared helpers in `optics_framework/engines/vision_models/base_methods.py` load a template and draw the match on the screenshot; both shipped models use them.

### Files to create

- `optics_framework/engines/vision_models/image_models/yolo.py`
- `optics_framework/engines/vision_models/image_models/aws_rekognition.py`
- `optics_framework/engines/vision_models/image_models/azure_vision.py`
- `optics_framework/engines/vision_models/image_models/tensorflow_model.py`

### Related documentation

- [Vision Models](https://optics-framework.org/docs/contribute/engines#vision-models)
- [Extending Vision Models](https://optics-framework.org/docs/contribute/extending#creating-new-image-detection-models)

## 5. Interactive test creation

**Priority**: Medium | **Difficulty**: Advanced | **Status**: Partly done

### Current state

You can write tests as CSV or YAML files, or in code. Since this item was written, `optics live` added an interactive mode: you run one keyword at a time against the live app, and `/save` writes the steps that worked into your suite as a module. See [Record a test](https://optics-framework.org/docs/create/record). The code is in `optics_framework/helper/live.py` and `optics_framework/helper/live_tui.py`. There is still no visual tool for people who do not want to type keywords.

### Goal

Support interactive test creation where users can:

- Record interactions automatically
- Visually select elements on screen
- Generate test steps automatically. **Done** in two ways: `optics live` records each step that passes and `/save` writes them as CSV, and in plain-English mode an AI model picks the steps for a goal you describe (`optics_framework/common/nl_agent.py`, see [Describe a test in plain English](https://optics-framework.org/docs/create/describe)).
- Edit tests in a visual interface
- Preview test execution step-by-step. **Done** in the terminal: `optics live` runs each step as you type it.

### Key features

#### Test recorder

Record user interactions and generate test steps:

- Capture mouse clicks, keyboard input, scrolls
- Automatically detect element locators
- Generate test steps in CSV/YAML format. **Done** for CSV through `optics live` and `/save`.
- Support for multiple strategies (XPath, text, image)

#### Visual element selector

Click on screen to select elements:

- Highlight elements on hover
- Show element information (XPath, text, attributes)
- Suggest multiple locator strategies
- Validate element locators

#### Test editor

Visual editor for test cases:

- Drag-and-drop test step reordering
- Edit step parameters
- Add/remove test steps
- Preview test structure

#### Element inspector

Inspect and validate element locators:

- Show all available locators for an element. Partly done: `GET /v1/sessions/{session_id}/screen_elements` and the MCP server list the elements on screen with ways to find each one (`optics_framework/common/screen_snapshot.py`).
- Test locator validity
- Suggest better locators
- Show element hierarchy

### Potential implementation

- **Web-based UI**: React/Vue.js frontend with FastAPI backend
- **Browser Extension**: Chrome/Firefox extension for recording
- **Desktop Application**: Electron app for test authoring
- **CLI Integration**: Extend existing CLI with interactive mode. **Done**: `optics live`.

### Files to create

- `optics_framework/helper/recorder.py` - Test recording functionality (the keyword recorder of `optics live` is in `optics_framework/helper/live.py`)
- `optics_framework/helper/inspector.py` - Element inspection tools
- `optics_framework/api/recorder_api.py` - API endpoints for recorder
- Web UI components (separate repo or `optics_framework/web_ui/`)

### Related documentation

- [CLI Usage](https://optics-framework.org/docs/reference/cli)
- [User Workflow](https://optics-framework.org/docs/create/organise)

## 6. Code simplification & unification

**Priority**: Medium | **Difficulty**: Intermediate | **Status**: Partly done

### Current state

Several parts of the code repeat the same patterns. If you unify them, the code is easier to maintain.

### Areas identified

#### Driver method patterns

Similar implementations across Appium, Selenium, and Playwright:

- `press_element()`, `enter_text()`, `clear_text()`, `scroll()` have similar patterns
- Common error handling
- Similar event logging

**Files**:

- `optics_framework/engines/drivers/appium.py`
- `optics_framework/engines/drivers/selenium.py`
- `optics_framework/engines/drivers/playwright.py`

**Solution**: Create base driver mixins or helper classes

#### Element source patterns

Similar code in find_element, page_source, screenshot classes:

- Common initialization patterns
- Similar error handling
- Common interface implementations

**Files**: `optics_framework/engines/elementsources/*.py`

**Solution**: Create common base class for element source implementations. Partly done: `EncodedScreenshotSource` in `optics_framework/common/elementsource_interface.py` is the shared base of the Appium, Selenium and Playwright screenshot sources, and decodes their screenshots with one set of size limits.

#### Vision model patterns

OCR models share similar structure:

- Common text detection patterns. Partly done: `TextInterface` in `optics_framework/common/text_interface.py` gives every OCR model one `find_element()` and reads each frame only once.
- Similar configuration handling
- Common error handling

**Files**: `optics_framework/engines/vision_models/ocr_models/*.py`

**Solution**: Enhanced base classes for vision models

#### Strategy factory pattern

Current implementation has hard-coded strategy registry:

- Strategy registration is static
- Limited flexibility for custom strategies

**File**: `optics_framework/common/strategies.py`

**Solution**: Make strategy registration more flexible and dynamic

#### Session management

Complex builder pattern could be simplified:

- Many intermediate steps
- Could use simpler factory pattern in some cases

**File**: `optics_framework/common/optics_builder.py`

**Solution**: Simplify builder pattern or add convenience methods

### Specific unification opportunities

1. **Base Driver Mixin**: Create `BaseWebDriverMixin` for common web driver methods
2. **Element Source Base**: Common base class for element source implementations
3. **Vision Model Base**: Enhanced base classes for vision models
4. **Strategy Registry**: Make strategy registration more flexible
5. **Configuration Normalization**: Unify configuration handling across components
6. **Error Handling Utilities**: Standardize error handling patterns

### Files to create/modify

**Create**:

- `optics_framework/common/base_driver_mixin.py` - Common driver methods
- `optics_framework/common/base_element_source.py` - Common element source base
- `optics_framework/common/error_utils.py` - Error handling utilities

**Modify**:

- `optics_framework/common/strategies.py` - Flexible strategy registration
- `optics_framework/common/optics_builder.py` - Simplify builder pattern
- All driver implementations to use mixins
- All element source implementations to use base class

### Related documentation

- [Architecture Overview](https://optics-framework.org/docs/contribute/architecture)
- [Extending the Framework](https://optics-framework.org/docs/contribute/extending)

## 7. Test coverage

**Priority**: High | **Difficulty**: Beginner to Intermediate | **Status**: Partly done

### Current state

The test suite has grown since this item was written: `tests/units/` has tests for the API, the common modules, the engines and the CLI helpers, and `tests/integration/` runs Playwright, Selenium and desktop journeys. Many core components still lack complete tests.

### Missing tests for

- Most engine implementations (drivers, element sources, vision models). Partly done: `tests/units/engines/` tests the drivers and element sources. Vision models have few tests.
- Strategy manager and location strategies. Partly done: `tests/units/common/test_strategies.py`.
- Event system and event handlers. Partly done: `tests/units/common/test_junit_eventhandler.py`.
- Session management edge cases
- Error handling scenarios
- Factory pattern implementations. Partly done: `tests/units/common/test_factories.py`.
- API layer endpoints. Partly done: `tests/units/common/test_expose_api.py` and `tests/units/api/`.
- CLI commands. Partly done: `tests/units/helpers/test_cli.py` and `tests/integration/test_cli_list.py`.

### Test files to create

#### Unit tests

- `tests/units/engines/drivers/test_ble.py` - BLE driver tests. **Exists.**
- `tests/units/engines/drivers/test_playwright.py` - Playwright driver tests. Partly done: `test_playwright_locator.py` and `test_playwright_settings_and_text.py` exist.
- `tests/units/engines/drivers/test_appium.py` - Appium driver tests (if missing). Partly done: several `test_appium_*.py` files exist in the same folder.
- `tests/units/engines/elementsources/test_playwright_find_element.py`. **Exists.**
- `tests/units/engines/elementsources/test_playwright_page_source.py`. **Exists.**
- `tests/units/engines/elementsources/test_playwright_screenshot.py`
- `tests/units/common/test_strategies.py` - Strategy manager tests. **Exists.**
- `tests/units/common/test_session_manager.py` - Session management tests
- `tests/units/api/test_verifier.py` - Verifier API tests. **Exists.**
- `tests/units/common/test_factories.py` - Factory pattern tests. **Exists.**

#### Integration tests

- `tests/integration/test_api_endpoints.py` - API endpoint integration tests. Unit tests for the endpoints exist in `tests/units/common/test_expose_api.py`.
- `tests/integration/test_session_lifecycle.py` - Full session lifecycle
- `tests/integration/test_driver_fallback.py` - Driver fallback mechanism

#### Functional tests

There is no `tests/functional/` folder yet.

- `tests/functional/test_end_to_end.py` - End-to-end test execution. Partly done: `tests/integration/test_playwright_journey.py` and `tests/integration/test_selenium_journey.py` run whole journeys.
- `tests/functional/test_vision_detection.py` - Vision detection workflows

### Testing guidelines

- Use `pytest` for all tests
- Follow existing test patterns in `tests/units/`
- Use fixtures from `tests/units/conftest.py`
- Aim for >80% code coverage
- Test both success and failure scenarios
- Include edge cases and error conditions

### Related documentation

- [Developer Guide](https://optics-framework.org/docs/contribute/setup#run-tests)
- [Architecture Overview](https://optics-framework.org/docs/contribute/architecture)

## 8. Security improvements

**Priority**: High | **Difficulty**: Intermediate | **Status**: Partly done

### Current state

The [REST API layer](https://optics-framework.org/docs/contribute/api-layer) page lists the security work that production use needs. `optics serve` and `optics mcp` have no authentication of their own. When you bind either one to an address other than loopback, it logs a warning (`warn_if_exposed()` in `optics_framework/common/http_guard.py`).

### CORS configuration

**Done**, with a stricter default than this item proposed.

The old state was that CORS allowed all origins (`allow_origins=["*"]`) in `optics_framework/common/expose_api.py`. The item asked for configurable CORS with environment-based restrictions. The proposed implementation was:

```python
# Allow configuration via environment variables
allowed_origins = os.getenv("OPTICS_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

What shipped, in `add_http_guards()` in `optics_framework/common/http_guard.py`:

- `OPTICS_CORS_ORIGINS` is a comma-separated allowlist. With no value, no browser origin is allowed.
- `*` is refused with error `E0501`, because any web page could then drive the server.
- A Host check refuses requests whose `Host` header is not a loopback name or a name in `OPTICS_ALLOWED_HOSTS`. This stops a web page from rebinding its domain to `127.0.0.1`.

### Authentication

**Current**: No authentication currently

**Needed**:

- API key authentication
- Bearer token authentication
- Session-based authentication

**Files to Modify**:

- `optics_framework/common/expose_api.py` - Add authentication middleware
- `optics_framework/common/auth.py` - Create authentication module (new file)

### Input validation

**Current**: Using Pydantic for validation

**Enhancements Needed**:

- Rate limiting per IP/session
- Request size limits. Partly done: uploaded images are refused above 64 MB encoded or 64 megapixels (`optics_framework/common/image_decode.py`).
- SQL injection prevention (if adding database support)
- XSS prevention for string inputs

### Related documentation

- [REST API Layer](https://optics-framework.org/docs/contribute/api-layer#security-considerations)
- [Security Policy](https://github.com/mozarkai/optics-framework/blob/main/SECURITY.md)

## 9. Feature development

**Priority**: Medium to High | **Difficulty**: Intermediate to Advanced | **Status**: Partly done

### MCP servicer

**Done.** The roadmap item was: introduce a dedicated service to handle MCP (Model Context Protocol), to make the framework more scalable and modular. `optics mcp` now runs an MCP server (`optics_framework/helper/mcp_server.py`). See the [MCP reference](https://optics-framework.org/docs/reference/mcp).

**Needed** (all done):

- MCP protocol implementation
- Service architecture design
- Integration with existing framework

### Omniparser integration

**From Roadmap**: Integrate Omniparser for flexible element extraction and location

**Goal**: Enable more flexible element parsing capabilities

**Needed** (all open):

- Omniparser library integration
- Parser configuration
- Strategy integration

### Playwright integration enhancements

**From Roadmap**: Add support for Playwright. **Done**: the `playwright` driver and its element sources ship (`optics_framework/engines/drivers/playwright.py`, `optics_framework/engines/elementsources/playwright_*.py`). See [Web](https://optics-framework.org/docs/platforms/web).

**Needed**:

- Complete remaining Playwright methods. Mostly done: a few calls are not supported, for example `get_app_version`, `force_terminate_app` and special keys that have no web key name.
- Add driver-specific strategies (see [section 3](#3-flexible-driver-specific-strategies)). Partly done there.
- Improve error handling

### Audio support

**From Roadmap**: Extend the framework to support audio inputs and outputs

**Goal**: Enable testing and verification of voice-based or sound-related interactions

**Needed** (all open):

- Audio input capture
- Audio output verification
- Speech recognition integration
- Audio comparison utilities

### Session persistence

**Identified in**: the [components](https://optics-framework.org/docs/contribute/components) page

**Current**: Sessions are in-memory only, lost on process termination

**Needed** (all open):

- Session serialization
- Session recovery on restart
- Session state snapshots
- Persistent storage backend

**Note:**
This overlaps with [section 1 (Stateless API Layer)](#1-stateless-api-layer) but focuses on persistence rather than migration.

### Additional drivers

- iOS driver enhancements
- Additional browser drivers (Edge, Safari). Partly done: the Playwright driver runs Chromium, Firefox or WebKit (the engine of Safari) through its `browser` setting, and Microsoft Edge through `channel: msedge`. Selenium supports Chrome and Firefox only.
- IoT device drivers
- Desktop application drivers (Windows, macOS, Linux). **Done**: Appium with the Xa11y driver drives desktop apps on all three (`optics_framework/engines/drivers/appium_platforms.py`). See [Desktop](https://optics-framework.org/docs/platforms/desktop).

## 10. Performance optimizations

**Priority**: Medium | **Difficulty**: Intermediate | **Status**: Partly done

### Areas identified

#### Strategy execution

**Current**: Strategies executed sequentially

**Opportunities**:

- Parallel strategy attempts where safe (see [section 2](#2-parallel-strategy-execution))
- Early exit optimization
- Strategy result caching

**File**: `optics_framework/common/strategies.py`

#### Factory caching

**Current**: Instance caching implemented (`_create_or_retrieve()` in `optics_framework/common/base_factory.py`, cleared with `clear_instances()`)

**Enhancements**:

- Cache invalidation strategies
- Memory-aware caching
- Cache size limits

**File**: `optics_framework/common/base_factory.py`

#### Event processing

**Current**: `EventManager` puts events on an `asyncio.Queue` and processes them in a background task (`optics_framework/common/events.py`). `EventSDK` sends events in batches (`send_batch_events()` in `optics_framework/common/eventSDK.py`).

**Opportunities**:

- Batch events for better throughput. **Done** for `EventSDK`.
- Async event processing. **Done** in `EventManager`.
- Event queue optimization

**Files**:

- `optics_framework/common/events.py`
- `optics_framework/common/eventSDK.py`

#### Image processing

**Current**: OCR and template matching operations

**Opportunities**:

- Parallel image processing
- Image caching. Partly done: each OCR model keeps its result for the last 4 frames, so a repeated read of the same screen is free (`FRAMES_REMEMBERED` in `optics_framework/common/text_interface.py`).
- Optimize OpenCV operations
- GPU acceleration where available

**Files**:

- `optics_framework/engines/vision_models/image_models/templatematch.py`
- `optics_framework/engines/vision_models/ocr_models/*.py`

### Related documentation

- [Architecture Decisions](https://optics-framework.org/docs/contribute/decisions)
- [Performance Considerations](https://optics-framework.org/docs/contribute/components#performance-considerations)

## 11. Documentation

**Priority**: Medium | **Difficulty**: Beginner to Intermediate | **Status**: Partly done

The docs are in the [optics-framework-org repository](https://github.com/mozarkai/optics-framework-org), under `docs/`.

### Documentation gaps

#### API examples

**Current**: API reference exists but lacks practical examples. Partly done: [Python API](https://optics-framework.org/docs/create/python) has a complete pytest example, and [HTTP API](https://optics-framework.org/docs/reference/http-api) has a walkthrough and an errors section.

**Needed**:

- More code examples in API reference
- Common use case examples
- Error handling examples

**Pages**: [Python API](https://optics-framework.org/docs/create/python) and [HTTP API](https://optics-framework.org/docs/reference/http-api)

#### Troubleshooting guides

**Current**: Partly done. [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting) lists common problems by the message Optics prints, and [Error codes](https://optics-framework.org/docs/reference/errors) lists each code.

**Needed**:

- Common issues and solutions. **Done**: [Troubleshooting](https://optics-framework.org/docs/help/troubleshooting).
- Debugging guides
- Performance troubleshooting
- Error code reference with solutions. **Done**: [Error codes](https://optics-framework.org/docs/reference/errors).

#### Performance tuning

**Needed**: Guide for optimizing framework performance

**Topics**:

- Configuration optimization
- Strategy selection guidance
- Memory management
- Parallel execution tips

#### Migration guides

**Needed**: When breaking changes occur

**Topics**:

- Version migration guides
- Configuration migration
- API migration guides

#### Video tutorials

**Needed**: Screen recordings for complex workflows

**Topics**:

- Getting started walkthrough
- Creating your first test
- Advanced features
- Troubleshooting common issues

#### Best practices

**Needed**: Complete best practices guide. Partly done: the [readiness checklist](https://optics-framework.org/docs/run/checklist) covers suites that run in CI.

**Topics**:

- Test design patterns
- Element locator best practices
- Configuration management
- CI/CD integration
- Error handling strategies

#### Integration examples

**Needed**: Examples with CI/CD systems

**Examples**:

- GitHub Actions. **Done**: [Run in CI](https://optics-framework.org/docs/run/ci).
- Jenkins
- GitLab CI. **Done**: [Run in CI](https://optics-framework.org/docs/run/ci).
- Azure DevOps
- CircleCI

### Related documentation

- [Contributing Guidelines](https://optics-framework.org/docs/contribute/)
- [Developer Guide](https://optics-framework.org/docs/contribute/setup#documentation-changes)

## 12. Infrastructure

**Priority**: Low to Medium | **Difficulty**: Intermediate | **Status**: Partly done

### CI/CD enhancements

#### Test coverage reporting

`pytest.toml` collects coverage (`--cov=optics_framework`), but the test workflow runs with `--no-cov` (`.github/workflows/tests.yml`).

**Needed** (all open):

- Automated coverage reports
- Coverage badges
- Coverage trend tracking
- Coverage thresholds

#### Performance benchmarking

**Needed** (all open):

- Automated performance tests
- Performance regression detection
- Benchmark comparisons
- Performance reports

#### Security scanning automation

**Needed**:

- Automated dependency scanning. **Done**: Dependabot (`.github/dependabot.yml`) and the OpenSSF Scorecard workflow (`.github/workflows/scorecard.yml`).
- Code security scanning. **Done**: CodeQL (`.github/workflows/codeql.yml`), and Bandit and Gitleaks in the pre-commit hooks (`.pre-commit-config.yaml`).
- Container security scanning
- Automated security updates. Partly done: Dependabot opens weekly update pull requests for pip packages.

### Tooling

#### Pre-commit hooks enhancements

**Current**: `.pre-commit-config.yaml` runs Ruff, Bandit, trailing-whitespace, end-of-file-fixer, check-yaml, check-json, Commitizen and Gitleaks.

**Enhancements**:

- Additional linting rules
- Documentation checks
- Test coverage checks
- Commit message validation improvements

#### Code quality metrics dashboard

**Current**: Partly done: a SonarQube scan runs in `.github/workflows/mozarksonar.yml`.

**Needed**:

- Code quality metrics
- Technical debt tracking
- Code complexity metrics
- Maintainability index

#### Dependency update automation

**Needed**:

- Automated dependency updates. **Done**: Dependabot, weekly, for pip.
- Security update prioritization
- Update testing automation
- Changelog generation. Configured: `.cz.toml` sets `update_changelog_on_bump`, so Commitizen updates the changelog when it bumps the version.

### Related documentation

- [Developer Guide](https://optics-framework.org/docs/contribute/setup)
- [CI/CD Workflows](https://github.com/mozarkai/optics-framework/tree/main/.github/workflows)

## Getting started

### Choose an area

1. Review the sections above and identify an area that interests you
2. Check the priority and difficulty levels
3. Review related documentation
4. Look at existing code to understand patterns

### Before you start

1. Read the [Contributing Guidelines](https://optics-framework.org/docs/contribute/)
2. Read the [Developer Guide](https://optics-framework.org/docs/contribute/setup)
3. Set up your development environment
4. Familiarize yourself with the codebase
5. [Open an issue](#propose-work) for anything larger than a small fix

### Making your contribution

1. **Fork the Repository**: Create your own fork
2. **Create a Branch**: Use a descriptive branch name
3. **Make Changes**: Follow coding standards and patterns
4. **Write Tests**: Add tests for your changes
5. **Update Documentation**: Update relevant docs
6. **Submit PR**: Create a pull request with clear description

### Need help?

- Open an issue on GitHub for questions
- Check existing documentation
- Review similar implementations in the codebase
- Ask in pull request comments

### Recognition

Contributors will be:

- Listed in the project's contributors
- Credited in release notes
- Acknowledged in documentation (for significant contributions)

## Summary

The areas fall into five groups:

- **Architecture**: Stateless API, flexible strategies
- **Features**: New drivers, interactive tools
- **Quality**: Tests, documentation, code simplification
- **Performance**: Optimizations and enhancements
- **Security**: Authentication, validation, hardening

**Start small:**
If you are new to the project, start with documentation improvements or test coverage. They are a good way to learn the codebase while you make a useful contribution.
