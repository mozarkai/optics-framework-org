# Optics documentation

> Guides and references for creating a test once and running it on every build, every device.

<div class="dh-hero">
<div>
<h1>Optics documentation</h1>
<p class="lede">Create a test once, the way that suits you, then run it on every build and every device. Start with a five-minute quickstart, or jump to the part you need.</p>
<div class="btn-row"><a class="btn btn-solid" href="https://optics-framework.org/docs/get-started/quickstart">Start the quickstart</a><a class="btn btn-ghost" href="https://optics-framework.org/docs/get-started/">What is Optics?</a></div>
</div>
<figure class="code doc-code has-title"><figcaption><span>Your first run</span></figcaption><pre><code><span class="prompt">$</span> <b>curl</b> -fsSL https://optics-framework.org/install | sh
<span class="prompt">$</span> <b>optics</b> quickstart
<b>What do you want to automate?</b> <span class="c-dim">[mobile/web] (mobile):</span> web
Project ready at: /Users/you/my-optics-project
<span class="prompt">$</span> <b>optics</b> execute my-optics-project
Total Test Cases: 3 | Passed: <span class="c-pass">3</span> | Failed: 0</code></pre></figure>
</div>

<section class="dh-band">
<h2 id="choose-your-path">Choose your path</h2>
<p class="dh-sub">Each path builds on the one before it. You don't need the advanced features to get value from Optics.</p>
<div class="paths">
<div class="path"><p class="path-tag">New to Optics</p><h3>Run your first test</h3><p>Install Optics, run a working sample, then write a test of your own against a real website.</p><ul><li><a href="https://optics-framework.org/docs/get-started/quickstart">Quickstart</a></li><li><a href="https://optics-framework.org/docs/get-started/first-test">Write your first test</a></li><li><a href="https://optics-framework.org/docs/get-started/concepts">How Optics works</a></li></ul></div>
<div class="path"><p class="path-tag">Building a suite</p><h3>Cover your app</h3><p>Pick how your team creates tests, make elements survive redesigns, and run the suite on every build.</p><ul><li><a href="https://optics-framework.org/docs/create/">Choose how to create tests</a></li><li><a href="https://optics-framework.org/docs/elements/">How Optics finds elements</a></li><li><a href="https://optics-framework.org/docs/run/ci">Run tests in CI</a></li></ul></div>
<div class="path"><p class="path-tag">Going further</p><h3>Automate more</h3><p>Drive tests from data, call APIs mid-test, and connect Optics to your AI agent or your own services.</p><ul><li><a href="https://optics-framework.org/docs/advanced/data-driven">Data-driven tests</a></li><li><a href="https://optics-framework.org/docs/create/agent">Let your AI agent build tests</a></li><li><a href="https://optics-framework.org/docs/advanced/http-api">Run keywords over HTTP</a></li></ul></div>
</div>
</section>

<section class="dh-band">
<h2 id="create-a-test-your-way">Create a test your way</h2>
<p class="dh-sub">Every way ends in the same plain-text files, so you can mix them in one project.</p>
<div class="cards cols-2">
<a class="card" href="https://optics-framework.org/docs/create/write"><span class="card-title">Write it in a spreadsheet</span><span class="card-text">No code needed. List the steps in CSV or YAML. Anyone on the team can read and review them.</span></a>
<a class="card" href="https://optics-framework.org/docs/create/record"><span class="card-title">Record it on the device</span><span class="card-text">No code needed. Run one step at a time in <code class="ic">optics live</code>. Every step that works is saved.</span></a>
<a class="card" href="https://optics-framework.org/docs/create/describe"><span class="card-title">Describe it in plain English</span><span class="card-text">Uses an AI model. Tell Optics what to do. An AI model drives the device and keeps the steps that mattered.</span></a>
<a class="card" href="https://optics-framework.org/docs/create/agent"><span class="card-title">Hand it to your AI agent</span><span class="card-text">Uses an AI model. Connect <code class="ic">optics mcp</code> to your agent. It explores the app and writes the suite.</span></a>
</div>
</section>

<section class="dh-band">
<h2 id="browse-the-docs">Browse the docs</h2>
<div class="dh-cols">
<div class="dh-col"><h3>Get started</h3><ul><li><a href="https://optics-framework.org/docs/get-started/install">Install Optics</a></li><li><a href="https://optics-framework.org/docs/get-started/quickstart">Quickstart</a></li><li><a href="https://optics-framework.org/docs/get-started/first-test">Write your first test</a></li><li><a href="https://optics-framework.org/docs/get-started/concepts">How Optics works</a></li></ul></div>
<div class="dh-col"><h3>Create tests</h3><ul><li><a href="https://optics-framework.org/docs/create/write">Write a test suite</a></li><li><a href="https://optics-framework.org/docs/create/record">Record a test</a></li><li><a href="https://optics-framework.org/docs/create/python">Use Optics from Python</a></li><li><a href="https://optics-framework.org/docs/create/organise">Organise a suite</a></li></ul></div>
<div class="dh-col"><h3>Find elements</h3><ul><li><a href="https://optics-framework.org/docs/elements/">How Optics finds elements</a></li><li><a href="https://optics-framework.org/docs/elements/define">Define elements</a></li><li><a href="https://optics-framework.org/docs/elements/text-and-images">Find by text and image</a></li><li><a href="https://optics-framework.org/docs/elements/self-heal">AI self-heal</a></li></ul></div>
<div class="dh-col"><h3>Run and report</h3><ul><li><a href="https://optics-framework.org/docs/run/">Run a suite</a></li><li><a href="https://optics-framework.org/docs/run/results">Read the results</a></li><li><a href="https://optics-framework.org/docs/run/error-detection">Catch error screens</a></li><li><a href="https://optics-framework.org/docs/run/ci">Run tests in CI</a></li></ul></div>
<div class="dh-col"><h3>Platforms</h3><ul><li><a href="https://optics-framework.org/docs/platforms/android">Android</a></li><li><a href="https://optics-framework.org/docs/platforms/ios">iOS</a></li><li><a href="https://optics-framework.org/docs/platforms/web">Web</a></li><li><a href="https://optics-framework.org/docs/platforms/tv">TV</a></li></ul></div>
<div class="dh-col"><h3>Advanced</h3><ul><li><a href="https://optics-framework.org/docs/advanced/variables">Variables</a></li><li><a href="https://optics-framework.org/docs/advanced/conditions">Conditions and loops</a></li><li><a href="https://optics-framework.org/docs/advanced/api-calls">Call APIs in a test</a></li><li><a href="https://optics-framework.org/docs/advanced/generate">Generate pytest or Robot code</a></li></ul></div>
<div class="dh-col"><h3>Reference</h3><ul><li><a href="https://optics-framework.org/docs/reference/keywords/">Keywords</a></li><li><a href="https://optics-framework.org/docs/reference/cli">CLI</a></li><li><a href="https://optics-framework.org/docs/reference/config">config.yaml</a></li><li><a href="https://optics-framework.org/docs/reference/errors">Error codes</a></li></ul></div>
<div class="dh-col"><h3>Help</h3><ul><li><a href="https://optics-framework.org/docs/help/troubleshooting">Troubleshooting</a></li><li><a href="https://optics-framework.org/docs/help/faq">FAQ</a></li><li><a href="https://optics-framework.org/docs/help/glossary">Glossary</a></li><li><a href="https://github.com/mozarkai/optics-framework/issues">Ask on GitHub</a></li></ul></div>
</div>
</section>

<section class="dh-band">
<h2 id="for-ai-agents">For AI agents</h2>
<p class="dh-sub">Every page is also available as Markdown. Add <code class="ic">.md</code> to a docs URL, or start from <a href="https://optics-framework.org/docs/llms.txt">the docs index for agents</a>.</p>
</section>
