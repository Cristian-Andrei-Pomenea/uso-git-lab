"""Browser E2E: one professor + two independent mobile players against a real server.

Optional: requires Playwright and a Chromium installation. The backend unit tests
remain runnable using only stdlib + pytest.
"""
import json
import os
import threading
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from live_quiz_server import start_server

ROOT = Path(__file__).resolve().parents[1]
playwright = pytest.importorskip('playwright.sync_api')
sync_playwright = playwright.sync_playwright


@pytest.fixture
def classroom():
    server = start_server('127.0.0.1', 0, '')
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        yield base
    finally:
        server.shutdown()
        server.server_close()
        thread.join(3)


def test_two_phone_players_and_host_live(classroom):
    with sync_playwright() as pw:
        chromium = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
        opts = {'headless': True, 'args':['--no-sandbox', '--disable-dev-shm-usage']}
        if Path(chromium).is_file(): opts['executable_path'] = chromium
        browser = pw.chromium.launch(**opts)
        host_ctx = browser.new_context(viewport={'width': 1500, 'height': 980})
        alice_ctx = browser.new_context(viewport={'width': 390, 'height': 820}, is_mobile=True)
        bob_ctx = browser.new_context(viewport={'width': 412, 'height': 875}, is_mobile=True)
        host, alice, bob = host_ctx.new_page(), alice_ctx.new_page(), bob_ctx.new_page()
        def attach(page, filename, js_name):
            # This CI environment's Chromium blocks all URL navigations, including
            # loopback. Load exactly the shipped HTML/JS into about:blank and bridge
            # the JS fetch calls to an actual localhost HTTP server through Python.
            def proxy(endpoint, data):
                payload = json.dumps(data).encode()
                request = Request(classroom+endpoint, data=payload, headers={'Content-Type':'application/json'})
                try:
                    with urlopen(request, timeout=5) as response:
                        return {'ok': True, 'payload': json.load(response)}
                except HTTPError as e:
                    return {'ok': False, 'payload': json.load(e)}
            page.expose_function('pythonAPI', proxy)
            html = (ROOT / filename).read_text('utf8')
            html = re.sub(r'<script\s+src=[^>]*></script>', '', html)
            html = re.sub(r'<link\s+rel="stylesheet"[^>]*>', '', html)
            page.set_content(html)
            page.evaluate("""() => {
                const store = {};
                const storage = {getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
                Object.defineProperty(window, 'localStorage', {configurable:true,value:storage});
                Object.defineProperty(window, 'sessionStorage', {configurable:true,value:storage});
                window.fetch = async (path, opts) => {
                    const r = await window.pythonAPI(path,JSON.parse(opts.body));
                    return {ok:r.ok,json:async()=>r.payload};
                };
            }""")
            page.add_style_tag(content=(ROOT/'arena.css').read_text('utf8'))
            page.add_script_tag(content=(ROOT/js_name).read_text('utf8'))
        attach(host,'arena.html','arena.js')
        attach(alice,'join.html','join.js')
        attach(bob,'join.html','join.js')
        errors = []
        for label, page in [('host', host), ('alice', alice), ('bob', bob)]:
            page.on('pageerror', lambda err, label=label: errors.append(f'{label}: {err}'))
        try:
            host.locator('#btnCreate').click()
            host.locator('#dashboard').wait_for(state='visible', timeout=8000)
            pin = host.locator('#pin').inner_text()
            assert len(pin) == 6 and pin.isdigit()
            assert host.locator('#qr').get_attribute('src') == '/api/qr?pin=' + pin
            for page, nickname in [(alice, 'Alice-USO'), (bob, 'Bob-USO')]:
                page.locator('#joinPin').fill(pin)
                page.locator('#nickname').fill(nickname)
                page.locator('#joinForm button[type="submit"]').click()
                page.locator('#playBox').wait_for(state='visible', timeout=8000)
                page.locator('#waiting').wait_for(state='visible', timeout=8000)
            host.locator('#playerCount').filter(has_text='2').wait_for(timeout=8000)
            host.locator('#btnNext').click()
            host.locator('#questionStage').wait_for(state='visible', timeout=8000)
            alice.locator('#playing').wait_for(state='visible', timeout=8000)
            bob.locator('#playing').wait_for(state='visible', timeout=8000)
            # Host token remains private; the students' page cannot inspect answers.
            token = host.evaluate("JSON.parse(localStorage.getItem('gitlab-arena-host')).token")
            body = json.dumps({'role': 'host', 'pin': pin, 'token': token}).encode()
            req = Request(classroom + '/api/state', data=body, headers={'Content-Type': 'application/json'})
            with urlopen(req, timeout=5) as res:
                state = json.load(res)
            correct = state['question']['correct']
            alice.locator('#myAnswers button').nth(correct).click()
            alice.get_by_text('Răspuns trimis').wait_for(timeout=6000)
            bob.locator('#myAnswers button').nth((correct+1) % 4).click()
            host.locator('#explanation').wait_for(state='visible', timeout=8000)
            alice.locator('#playerReveal').wait_for(state='visible', timeout=8000)
            bob.locator('#playerReveal').wait_for(state='visible', timeout=8000)
            assert 'CORECT' in alice.locator('#myResult').inner_text()
            assert 'Nu de data asta' in bob.locator('#myResult').inner_text()
            assert int(alice.locator('#myScore').inner_text()) >= 500
            assert bob.locator('#myScore').inner_text() == '0'
            assert 'Alice-USO' in host.locator('#podium').inner_text()
            host.on('dialog', lambda dialog: dialog.accept())
            host.locator('#btnFinish').click()
            host.locator('#finished').wait_for(state='visible', timeout=8000)
            alice.locator('#playerFinished').wait_for(state='visible', timeout=8000)
            bob.locator('#playerFinished').wait_for(state='visible', timeout=8000)
            assert not errors, errors
        finally:
            browser.close()
