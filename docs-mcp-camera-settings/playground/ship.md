# Ship a release

Two simulations of Birch, a demo shop app, at https://optics-framework.org/playground/ship. Neither runs Optics. They show how its locator ladder behaves when the app changes.

## Break the test

Pick the changes to make to the sign-in button, then ship the release. Optics tries each identity of the element, cheapest first:

1. **XPath:** a native query through the accessibility tree.
2. **Text:** the visible text, CSS or class in the page source.
3. **OCR:** reads the screenshot.
4. **Image:** matches a reference picture of the element on screen.
5. **AI self-heal (optional):** an LLM reads the screen and recovers with the same keywords.

The result says if the test passes, fails on a real bug, or fails when the app still works.

## Ship release after release

Set the odds of each change and bug per release, pick 25, 50 or 100 releases, and compare three suites: one value per element, every value, and every value with AI self-heal.

- Each release ships each change at the odds you set. The same seed and odds always ship the same releases.
- Changes stay in the app. A bug stays until a run catches it, and the next release fixes it.
- AI self-heal starts only when every value fails, and only for actions. Assert Presence does not heal.
- Error detection reads the text on the last screen once, at the end of the run.
- After a false failure, a healed step or a pass on a later value, the team updates that element to match the app.
- The simulation counts outcomes. It has no timings.
