"""Regenerate site/openapi.json from the `optics serve` FastAPI app.

Run it with the Python environment of an optics-framework checkout, ideally at the
release tag that PyPI ships:

    <checkout>/.venv/bin/python scripts/openapi.py <checkout> [site/openapi.json]
"""

import json
import sys
from pathlib import Path

checkout = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2] if len(sys.argv) > 2 else "site/openapi.json")
sys.path.insert(0, str(checkout))

from optics_framework.common.expose_api import app  # noqa: E402
from optics_framework.helper.version import VERSION  # noqa: E402

spec = app.openapi()
spec["info"]["description"] = (
    f"The HTTP API of `optics serve` from optics-framework {VERSION}. It is not hosted on "
    "optics-framework.org: install Optics (`pip install optics-framework`) and run "
    "`optics serve`, which listens on http://127.0.0.1:8000 by default (`--host` and "
    "`--port` change it). Start a session with POST /v1/sessions/start, run keywords "
    "with POST /v1/sessions/{session_id}/action, and list keywords with GET /v1/keywords. "
    "The server has no authentication, so keep it on a trusted network."
)
spec["servers"] = [{"url": "http://127.0.0.1:8000", "description": "optics serve on your own machine (default host and port)"}]
spec["externalDocs"] = {
    "description": "REST API usage guide",
    "url": "https://mozarkai.github.io/optics-framework/usage/REST_API_usage/",
}
target.write_text(json.dumps(spec, indent=2) + "\n")
print(f"wrote {target} from optics-framework {VERSION}")
