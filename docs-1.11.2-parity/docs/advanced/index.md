# Advanced

> Add data, logic and integrations to your suites once the basics are in place.

Most suites never need the features in this section. A list of modules with good elements and a few checks covers most user flows. Reach for these when a flow depends on data, needs to branch, or when another system needs to drive Optics.

## Logic and data

- [Variables](https://optics-framework.org/docs/advanced/variables): Store values, compute new ones, and use them in later steps.
- [Data-driven tests](https://optics-framework.org/docs/advanced/data-driven): Run one flow once per row of a data file.
- [Conditions and loops](https://optics-framework.org/docs/advanced/conditions): Branch on what's on screen, and repeat modules.
- [Call APIs in a test](https://optics-framework.org/docs/advanced/api-calls): Fetch or create data over HTTP mid-test, and use the response in later steps.

## Integrate

- [Run keywords over HTTP](https://optics-framework.org/docs/advanced/http-api): Drive a device from your own service with `optics serve`.
- [Generate pytest or Robot code](https://optics-framework.org/docs/advanced/generate): Turn a suite into code you can extend.
- [Let your AI agent build tests](https://optics-framework.org/docs/create/agent): Connect `optics mcp` to Claude, Cursor or any MCP client.
- [Use Optics from Python](https://optics-framework.org/docs/create/python): Call keywords from your own scripts.

**How logic runs in a suite:**
Flow-control keywords run other modules. Steps inside those modules work slightly differently from top-level steps: they use only the first value of each element, and they don't accept `name=value` parameters. Keep modules that run inside loops and conditions simple, and give their elements a reliable first value.
