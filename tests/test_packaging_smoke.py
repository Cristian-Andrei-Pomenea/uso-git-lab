"""Catch incomplete vendoring when a clean GitHub checkout starts the quiz.

The original incident omitted nested qrcode packages even though the developer's
local tree contained them, so checking only local imports is not sufficient.
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

# Required package files, including nested imports used to render the SVG QR.
QR_VENDOR_FILES = (
    "vendor/qrcode/__init__.py",
    "vendor/qrcode/LUT.py",
    "vendor/qrcode/base.py",
    "vendor/qrcode/constants.py",
    "vendor/qrcode/exceptions.py",
    "vendor/qrcode/main.py",
    "vendor/qrcode/util.py",
    "vendor/qrcode/compat/__init__.py",
    "vendor/qrcode/compat/etree.py",
    "vendor/qrcode/compat/png.py",
    "vendor/qrcode/image/__init__.py",
    "vendor/qrcode/image/base.py",
    "vendor/qrcode/image/pil.py",
    "vendor/qrcode/image/pure.py",
    "vendor/qrcode/image/styledpil.py",
    "vendor/qrcode/image/styles/__init__.py",
    "vendor/qrcode/image/styles/colormasks.py",
    "vendor/qrcode/image/styles/moduledrawers/__init__.py",
    "vendor/qrcode/image/styles/moduledrawers/base.py",
    "vendor/qrcode/image/styles/moduledrawers/pil.py",
    "vendor/qrcode/image/styles/moduledrawers/svg.py",
    "vendor/qrcode/image/svg.py",
)


def test_qr_vendored_subpackages_are_present_and_git_tracked():
    missing = [name for name in QR_VENDOR_FILES if not (ROOT / name).is_file()]
    assert not missing, f"Bundled QR vendor files missing: {missing}"

    # On the contributor's machine this protects against accidentally omitting
    # nested files from a git add/commit; on Actions, it verifies the checkout.
    if (ROOT / ".git").exists():
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", "--", *QR_VENDOR_FILES],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        assert result.returncode == 0, f"Untracked QR dependency: {result.stderr}"


def test_clean_python_can_import_server_and_render_real_svg_qr():
    # -S does not load site-packages: a globally installed qrcode or Pillow
    # must not accidentally hide omissions in the bundled package.
    script = """
import io
import json
import urllib.request
import threading
import live_quiz_server as app
from qrcode.image.svg import SvgPathImage

assert 'vendor/qrcode' in app.qrcode.__file__.replace('\\\\', '/')
q = app.qrcode.QRCode(image_factory=SvgPathImage)
q.add_data('http://127.0.0.1:8798/join?pin=123456')
q.make(fit=True)
buf = io.BytesIO()
q.make_image().save(buf)
assert b'<svg' in buf.getvalue() and len(buf.getvalue()) > 300
server = app.start_server('127.0.0.1', 0, '')
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with urllib.request.urlopen('http://127.0.0.1:%s/api/health' % server.server_port, timeout=5) as response:
        result = json.loads(response.read())
    assert result['ok'] and result['questions'] >= 15
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
"""
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    result = subprocess.run(
        [sys.executable, "-S", "-c", script],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=15, check=False,
    )
    assert result.returncode == 0, f"Clean Python startup failed:\n{result.stdout}\n{result.stderr}"
