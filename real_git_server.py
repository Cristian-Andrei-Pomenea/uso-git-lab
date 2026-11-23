#!/usr/bin/env python3
"""Git//LAB real mode: strictly allowlisted Git commands in disposable local repos.

Requires Python 3.9+ and Git. No packages, GitHub authentication, network, or shell.
Run: python3 real_git_server.py
All writes are limited to a private temp workspace, never your existing repositories.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import threading
import urllib.parse
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = Path(__file__).resolve().parent
NAMES = ('alice', 'bob')
FILES = {'README.md', 'bubble-sort.c', '.gitignore', 'notes.txt'}
REF = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._/-]{0,55}$')
MAX_BODY = 8192

class GitSandbox:
    def __init__(self):
        self.lock = threading.RLock()
        self.root = Path(tempfile.mkdtemp(prefix='uso-git-live-')).resolve()
        self.rem = self.root / 'origin.git'
        self.env = os.environ.copy()
        self.env.update({
            'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull,
            'GIT_TERMINAL_PROMPT': '0', 'GIT_PAGER': 'cat',
            'GIT_ALLOW_PROTOCOL': 'file', 'GIT_EDITOR': 'true',
            'GIT_ASKPASS': 'echo', 'GIT_TRACE': '0',
            'GIT_TEMPLATE_DIR': str(self.root / 'empty-template'),
        })
        (self.root / 'empty-template').mkdir()
        self.reset()

    def git(self, where, args, timeout=8):
        p = subprocess.run(['git', *args], cwd=where, env=self.env, text=True,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                           stdin=subprocess.DEVNULL, timeout=timeout)
        return p.returncode, p.stdout.strip()

    def expect(self, where, args):
        code, result = self.git(where, args)
        if code:
            raise RuntimeError('Git setup failed: ' + result)
        return result

    def reset(self):
        with self.lock:
            for name in (*NAMES, 'origin.git'):
                loc = self.root / name
                if loc.exists():
                    if loc.is_symlink():
                        raise RuntimeError('Unexpected symlink inside Git sandbox')
                    shutil.rmtree(loc)
            self.expect(self.root, ['init', '--bare', '--initial-branch=main', str(self.rem)])
            for actor in NAMES:
                self.expect(self.root, ['clone', str(self.rem), actor])
                repo = self.root / actor
                self.expect(repo, ['config', '--local', 'user.name', 'Alice' if actor == 'alice' else 'Bob'])
                self.expect(repo, ['config', '--local', 'user.email', actor + '@uso.invalid'])
                self.expect(repo, ['config', '--local', 'pull.rebase', 'false'])
                self.expect(repo, ['config', '--local', 'core.hooksPath', str(self.root / 'empty-template')])
            (self.root / 'alice' / 'README.md').write_text('# Sorting Algorithms\n\nOriginal: proiect USO.\n', encoding='utf-8')
            self.expect(self.root / 'alice', ['add', 'README.md'])
            self.expect(self.root / 'alice', ['commit', '-m', 'Initial commit: add README'])
            self.expect(self.root / 'alice', ['push', '-u', 'origin', 'main'])
            self.expect(self.root / 'bob', ['pull', '--no-rebase', 'origin', 'main'])
            return {'ok': True, 'message': 'Două clone și remote bare reinițializate.'}

    @staticmethod
    def valid_ref(s):
        return bool(REF.fullmatch(s) and '..' not in s and not s.endswith(('.lock', '.', '/'))
                    and not s.startswith(('.', '-')) and '//' not in s and '@{' not in s)

    def _validate(self, args):
        if not args or args[0] != 'git' or len(args) < 2:
            return None
        c, rest = args[1], args[2:]
        if c == 'status' and rest in ([], ['--short'], ['-sb']): return args[1:]
        if c == 'log' and (not rest or all(x in {'--oneline', '--graph', '--all', '--decorate', '-8', '-12'} for x in rest)):
            return args[1:]
        if c == 'diff' and (not rest or rest in (['--cached'], ['--staged'])): return args[1:]
        if c == 'reflog' and rest in ([], ['-8']): return args[1:]
        if c == 'remote' and rest == ['-v']: return args[1:]
        if c == 'branch':
            if not rest or rest == ['-a']: return args[1:]
            if len(rest) == 1 and self.valid_ref(rest[0]): return args[1:]
            if len(rest) == 2 and rest[0] == '-d' and self.valid_ref(rest[1]): return args[1:]
        if c in ('switch', 'checkout'):
            if len(rest) == 1 and self.valid_ref(rest[0]): return args[1:]
            if len(rest) == 2 and rest[0] in ('-c', '-b') and self.valid_ref(rest[1]): return args[1:]
        if c == 'add' and rest and all(x in FILES | {'.', '-A'} for x in rest): return args[1:]
        if c == 'commit' and len(rest) == 2 and rest[0] == '-m' and 0 < len(rest[1]) <= 120 and '\n' not in rest[1]: return args[1:]
        if c == 'push':
            rr = rest[1:] if rest and rest[0] == '-u' else rest
            if len(rr) == 2 and rr[0] == 'origin' and self.valid_ref(rr[1]): return args[1:]
        if c == 'fetch' and rest in ([], ['origin']): return args[1:]
        if c == 'pull' and rest in (['origin', 'main'], ['--no-rebase', 'origin', 'main']):
            return ['pull', '--no-rebase', 'origin', 'main']
        if c == 'merge':
            if rest == ['--abort']: return args[1:]
            if len(rest) == 1 and (self.valid_ref(rest[0]) or rest[0] == 'origin/main'): return args[1:]
        if c == 'restore' and rest and (rest in [[x] for x in FILES] + [['--staged', x] for x in FILES]): return args[1:]
        if c == 'show' and not rest: return args[1:]
        return None

    def run(self, actor, command):
        with self.lock:
            if actor not in NAMES: return {'ok': False, 'output': 'Actor necunoscut.'}
            if not isinstance(command, str) or len(command) > 800:
                return {'ok': False, 'output': 'Comandă prea lungă.'}
            cmd = command.strip()
            repo = self.root / actor
            # A very small edit primitive, NOT a shell interpreter.
            m = re.fullmatch(r'echo\s+(["\'])([^\n\r]{0,300}?)\1\s*(>>|>)\s*([\w.\-]+)', cmd)
            if m:
                filename = m.group(4)
                if filename not in FILES:
                    return {'ok': False, 'output': 'Editor limitat la ' + ', '.join(sorted(FILES))}
                dest = repo / filename
                if dest.is_symlink(): return {'ok': False, 'output': 'Symlink refuzat.'}
                if dest.exists() and dest.stat().st_size > 20000:
                    return {'ok': False, 'output': 'Fișier prea mare pentru demo.'}
                with dest.open('a' if m.group(3) == '>>' else 'w', encoding='utf-8') as f:
                    f.write(m.group(2) + '\n')
                return {'ok': True, 'output': f'Actualizat {filename} în working tree ({actor}).'}
            if cmd in ('ls', 'ls -a'):
                names = sorted([p.name for p in repo.iterdir()])
                return {'ok': True, 'output': '\n'.join(names)}
            if cmd.startswith('cat '):
                name = cmd[4:].strip()
                if name not in FILES or (repo/name).is_symlink():
                    return {'ok': False, 'output': 'Fișier nepermis.'}
                path = repo/name
                if not path.is_file(): return {'ok': False, 'output': 'Fișierul nu există.'}
                return {'ok': True, 'output': path.read_text(encoding='utf-8')[:20000]}
            try:
                args = shlex.split(cmd)
            except ValueError:
                return {'ok': False, 'output': 'Ghilimele neînchise.'}
            safe = self._validate(args)
            if safe is None:
                return {'ok': False, 'output': 'Comandă nepermisă în sandbox. Vezi comenzile acceptate. NU este un shell general.'}
            try:
                code, output = self.git(repo, safe)
            except subprocess.TimeoutExpired:
                return {'ok': False, 'output': 'Comandă întreruptă după timeout.'}
            return {'ok': code == 0, 'output': output or '(fără output)', 'code': code}

    def snapshot(self, actor):
        with self.lock:
            if actor not in NAMES: actor = 'alice'
            def g(repo, args):
                return self.git(repo, args)[1]
            result = {'actor': actor, 'root': str(self.root), 'git_version': g(self.root, ['--version']),
                      'actors': {}, 'remote': g(self.rem, ['for-each-ref', '--format=%(refname:short) → %(objectname:short)', 'refs/heads'])}
            commits = {}
            for name in (*NAMES, 'origin.git'):
                repo = self.root / name
                raw = g(repo, ['log', '--all', '--format=%H%x1f%P%x1f%s%x1f%ct'])
                for line in raw.splitlines():
                    parts = line.split('\x1f')
                    if len(parts) == 4 and parts[0] not in commits:
                        commits[parts[0]] = {'id': parts[0][:7], 'hash': parts[0], 'parents': parts[1].split() if parts[1] else [], 'msg': parts[2], 'time': int(parts[3])}
            result['commits'] = sorted(commits.values(), key=lambda x: (x['time'], x['hash']))
            for name in NAMES:
                repo = self.root / name
                files = {}
                for filename in FILES:
                    f = repo / filename
                    if f.is_file() and not f.is_symlink(): files[filename] = f.read_text(encoding='utf-8')[:15000]
                result['actors'][name] = {
                    'branch': g(repo, ['branch', '--show-current']),
                    'head': g(repo, ['rev-parse', '--short', 'HEAD']),
                    'status': g(repo, ['status', '-sb']),
                    'porcelain': g(repo, ['status', '--porcelain=v1']),
                    'files': files,
                    'refs': g(repo, ['for-each-ref', '--format=%(refname:short) → %(objectname:short)', 'refs/heads', 'refs/remotes']),
                }
            return result

    def close(self):
        with self.lock:
            if self.root.exists(): shutil.rmtree(self.root)

class LocalHandler(SimpleHTTPRequestHandler):
    sandbox = None
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def host_ok(self):
        host = self.headers.get('Host', '').split(':')[0]
        return host in ('localhost', '127.0.0.1', '[::1]')

    def reply(self, code, value):
        data = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.host_ok(): return self.reply(403, {'error':'Host nepermis.'})
        u = urllib.parse.urlparse(self.path)
        if u.path == '/api/state':
            actor = urllib.parse.parse_qs(u.query).get('actor', ['alice'])[0]
            return self.reply(200, self.sandbox.snapshot(actor))
        if u.path == '/': self.path = '/index.html'
        if u.path == '/real-git.html': self.path = '/real-git.html'
        # Prevent exposing server code, repo internals, files outside the public frontend.
        allowed = {'/index.html', '/styles.css', '/app.js', '/masterclass.css', '/masterclass.js',
                   '/real-git.html', '/real-git.js', '/real-git.css', '/GIT-LAB-08-MASTERCLASS-OFFLINE.html'}
        if urllib.parse.urlparse(self.path).path not in allowed:
            return self.reply(404, {'error':'Resursă necunoscută.'})
        return super().do_GET()

    def do_POST(self):
        if not self.host_ok(): return self.reply(403, {'error':'Host nepermis.'})
        origin = self.headers.get('Origin', '')
        if origin and urllib.parse.urlparse(origin).hostname not in ('127.0.0.1','localhost'):
            return self.reply(403, {'error':'Origin nepermis.'})
        path = urllib.parse.urlparse(self.path).path
        if path not in ('/api/run', '/api/reset'):
            return self.reply(404, {'error':'Not found'})
        try:
            count = int(self.headers.get('Content-Length','0'))
            if not 0 <= count <= MAX_BODY: return self.reply(413, {'error':'Request prea mare.'})
            body = json.loads(self.rfile.read(count) or b'{}')
            if not isinstance(body, dict): raise ValueError('JSON object expected')
        except (ValueError, json.JSONDecodeError):
            return self.reply(400, {'error':'JSON invalid.'})
        try:
            result = self.sandbox.reset() if path == '/api/reset' else self.sandbox.run(body.get('actor','alice'), body.get('command',''))
            return self.reply(200, result)
        except Exception as exc:
            return self.reply(500, {'error': str(exc)})

    def log_message(self, fmt, *args):
        pass

def create_server(port=8766):
    sandbox = GitSandbox()
    class Handler(LocalHandler):
        pass
    Handler.sandbox = sandbox
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    server.git_sandbox = sandbox
    return server

def main():
    parser = argparse.ArgumentParser(description='Git//LAB real Git server, localhost only.')
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    server = create_server(args.port)
    url = f'http://127.0.0.1:{server.server_port}/real-git.html'
    print('\n  ⌁ GIT//LAB — REAL GIT MODE')
    print('  ' + url)
    print('  Git rulează doar în: ' + str(server.git_sandbox.root))
    print('  CTRL+C oprește serverul și șterge mediul temporar.\n', flush=True)
    if not args.no_browser: webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=0.1)
    except KeyboardInterrupt:
        print('\nOprire Git//LAB ...')
    finally:
        server.server_close()
        server.git_sandbox.close()

if __name__ == '__main__':
    main()
