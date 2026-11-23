#!/usr/bin/env python3
"""Git//LAB ARENA: zero-install multiplayer quiz for a classroom.

Start with: python3 live_quiz_server.py --port 8798
Uses only stdlib; bundled QR library under vendor/ is licensed BSD-3-Clause.
All game data are in RAM, automatically lost on server restart.
"""
from __future__ import annotations
import argparse
import io
import json
import os
from pathlib import Path
import random
import re
import secrets
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse, quote

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'vendor'))
import qrcode
from qrcode.image.svg import SvgPathImage

QUESTIONS = json.loads((ROOT / 'questions.json').read_text('utf-8'))
STATIC = {'/': 'arena.html', '/arena': 'arena.html', '/host': 'arena.html',
          '/join': 'join.html', '/join.html': 'join.html', '/arena.html': 'arena.html',
          '/arena.css': 'arena.css', '/arena.js': 'arena.js', '/join.js': 'join.js',
          '/': 'arena.html', '/index.html': 'index.html', '/styles.css': 'styles.css',
          '/app.js': 'app.js', '/masterclass.html': 'masterclass.html',
          '/masterclass.css': 'masterclass.css', '/masterclass.js': 'masterclass.js'}
MIME = {'.html': 'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8'}
MAX_POST = 4096
MAX_PLAYERS = 180
EXPIRY_SECONDS = 4*60*60

def random_pin(used):
    for _ in range(100):
        p = f'{secrets.randbelow(900000)+100000}'
        if p not in used: return p
    raise RuntimeError('No PIN available')

def clamp_int(value, low, high, default):
    try: return max(low, min(high, int(value)))
    except (TypeError, ValueError): return default

def player_name(raw):
    if not isinstance(raw, str): return ''
    return re.sub(r'\s+', ' ', ''.join(c for c in raw if c.isprintable() and c not in '<>&"\'\\')).strip()[:25]

class QuizStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.sessions = {}
    def get(self, pin):
        s = self.sessions.get(str(pin))
        if s and (time.time()-s['created'] > EXPIRY_SECONDS):
            del self.sessions[str(pin)]; return None
        return s
    def new(self, count=10, duration=25):
        with self.lock:
            if len(self.sessions) > 16:
                cutoff = sorted(self.sessions, key=lambda p: self.sessions[p]['created'])[:5]
                for k in cutoff: del self.sessions[k]
            pin = random_pin(self.sessions)
            # Keep the curated introductory order, then extend it for longer games.
            preferred = [0, 1, 2, 3, 5, 6, 8, 11, 13, 15]
            order = preferred + [i for i in range(len(QUESTIONS)) if i not in preferred]
            ids = order[:max(1, min(count, len(QUESTIONS)))]
            s = dict(pin=pin, key=secrets.token_urlsafe(32), created=time.time(),
                phase='lobby', index=-1, duration=duration, ids=ids, deadline=0,
                revealed=0, players={}, answers={}, version=1)
            self.sessions[pin] = s
            return s
    def get_host(self, pin, key):
        s=self.get(pin)
        if not s or not isinstance(key,str) or not secrets.compare_digest(s['key'],key):
            raise PermissionError('Cheie de profesor invalidă.')
        return s
    def get_player(self, pin, pid, key):
        s=self.get(pin)
        if not s or not isinstance(pid,str) or not isinstance(key,str): raise PermissionError('Sesiune inexistentă.')
        p=s['players'].get(pid)
        if not p or not secrets.compare_digest(p['token'],key): raise PermissionError('Sesiune de jucător invalidă.')
        return s,p
    def join(self, pin, name):
        with self.lock:
            s=self.get(pin)
            if not s: raise ValueError('PIN inexistent sau expirat.')
            if s['phase']!='lobby': raise ValueError('Jocul a început. Participarea este închisă.')
            clean=player_name(name)
            if len(clean)<2: raise ValueError('Alege un nickname de cel puțin 2 caractere.')
            if len(s['players'])>=MAX_PLAYERS: raise ValueError('Sesiunea este plină.')
            if any(x['name'].casefold()==clean.casefold() for x in s['players'].values()):
                raise ValueError('Nickname deja folosit. Alege altul.')
            pid=secrets.token_urlsafe(12)
            p=dict(id=pid, token=secrets.token_urlsafe(24), name=clean, points=0, correct=0, streak=0)
            s['players'][pid]=p; s['version']+=1
            return {'pin':str(pin), 'id':pid,'token':p['token'], 'name':clean}
    def advance_timeout(self, s):
        if s['phase']=='question' and time.monotonic() >= s['deadline']:
            s['phase']='reveal';s['revealed']=time.time();s['version']+=1
    def rank(self, s):
        return [dict(name=p['name'],points=p['points'],correct=p['correct'],streak=p['streak'])
                for p in sorted(s['players'].values(),key=lambda p:(-p['points'],-p['correct'],p['name'].casefold()))]
    def question(self, s, include_answer):
        if s['index']<0: return None
        q=QUESTIONS[s['ids'][s['index']]]
        data={k:q[k] for k in ('topic','round','question','options','seconds')}
        data['seconds']=s['duration']
        if include_answer:
            data['correct']=q['correct'];data['explain']=q['explain']
        return data
    def get_state(self, pin, mode, identity=None, token=None):
        with self.lock:
            if mode=='host': s=self.get_host(pin,token)
            elif mode=='player': s,p=self.get_player(pin,identity,token)
            else: raise PermissionError('Rol invalid.')
            self.advance_timeout(s)
            show = s['phase'] in ('reveal','finished')
            data={'pin':s['pin'],'phase':s['phase'],'version':s['version'],
                  'index':s['index'],'total':len(s['ids']),
                  'players':len(s['players']),
                  'question':self.question(s, include_answer=(mode=='host' or show)),
                  'remaining':max(0,round(s['deadline']-time.monotonic(),1)) if s['phase']=='question' else 0,
                  'leaderboard':self.rank(s) if show or mode=='host' else [],
                  'answered':len(s['answers'].get(s['index'],{})) if s['index']>=0 else 0}
            if mode=='host':
                data['names']=[p['name'] for p in s['players'].values()]
                if s['index']>=0:
                    allanswers=s['answers'].get(s['index'],{})
                    data['distribution']=[sum(x['choice']==i for x in allanswers.values()) for i in range(4)]
            else:
                ans=s['answers'].get(s['index'],{}).get(identity)
                data['me']={'name':p['name'],'points':p['points'],'correct':p['correct'],
                            'choice':ans['choice'] if ans else None,
                            'earned':ans['earned'] if ans and show else None,
                            'isCorrect':ans['isCorrect'] if ans and show else None}
            return data
    def submit(self, pin, pid, token, idx, choice):
        with self.lock:
            s,p=self.get_player(pin,pid,token)
            self.advance_timeout(s)
            if s['phase']!='question': raise ValueError('Fereastra de răspuns este închisă.')
            if idx!=s['index']: raise ValueError('Întrebarea s-a schimbat.')
            if not isinstance(choice,int) or isinstance(choice,bool) or not 0<=choice<4:
                raise ValueError('Răspuns invalid.')
            answers=s['answers'].setdefault(s['index'],{})
            if pid in answers: raise ValueError('Ai răspuns deja la această întrebare.')
            q=QUESTIONS[s['ids'][s['index']]]
            elapsed=max(0, s['duration']-max(0,s['deadline']-time.monotonic()))
            correct=(choice==q['correct'])
            gained=round(500+500*max(0,1-elapsed/s['duration'])) if correct else 0
            if correct:p['streak']+=1; p['correct']+=1
            else:p['streak']=0
            p['points']+=gained
            answers[pid]=dict(choice=choice,earned=gained,isCorrect=correct)
            s['version']+=1
            if len(answers)==len(s['players']) and len(s['players'])>0:
                s['phase']='reveal';s['version']+=1
            return {'accepted':True,'choice':choice}
    def action(self, pin, token, action):
        with self.lock:
            s=self.get_host(pin,token)
            self.advance_timeout(s)
            if action=='next' and s['phase'] in ('lobby','reveal'):
                if s['index']+1>=len(s['ids']): s['phase']='finished'
                else:
                    s['index']+=1;s['phase']='question'
                    s['duration']=clamp_int(s['duration'],10,90,25)
                    s['deadline']=time.monotonic()+s['duration']
                    s['answers'][s['index']]={}
            elif action=='reveal' and s['phase']=='question':
                s['phase']='reveal';s['revealed']=time.time()
            elif action=='finish' and s['phase']!='finished':
                s['phase']='finished'
            else: raise ValueError('Acțiune nepermisă în faza curentă.')
            s['version']+=1
            return {'ok':True,'phase':s['phase']}

STORE = QuizStore()

class Handler(BaseHTTPRequestHandler):
    server_version='GitLabArena/1.0'
    def log_message(self, fmt, *args):
        # Avoid leaking PIN/key/nicknames via request URLs; localhost errors handled in UI.
        pass
    def cors_ok(self):
        origin=self.headers.get('Origin')
        if not origin: return True
        try: return urlparse(origin).netloc==self.headers.get('Host')
        except ValueError: return False
    def json_response(self, code, data):
        raw=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        self.blob(code,raw,'application/json; charset=utf-8')
    def blob(self,code,data,content_type):
        self.send_response(code)
        self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        self.end_headers()
        try: self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError): pass
    def do_GET(self):
        url=urlparse(self.path)
        if url.path == '/api/health':
            return self.json_response(200,{'ok':True,'name':'GIT//LAB ARENA', 'questions':len(QUESTIONS)})
        if url.path == '/api/qr':
            pin=parse_qs(url.query).get('pin',[''])[0]
            s=STORE.get(pin)
            if not s: return self.json_response(404,{'error':'PIN invalid.'})
            public=self.server.public_url
            if not public:
                host=self.headers.get('Host','').split(':')[0]
                if host in ('127.0.0.1','localhost','[::1]'): host=self.server.lan_ip
                public=f'http://{host}:{self.server.server_port}'
            link=public.rstrip('/')+'/join?pin='+quote(pin)
            qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,border=2,box_size=10,image_factory=SvgPathImage)
            qr.add_data(link);qr.make(fit=True)
            out=io.BytesIO();qr.make_image().save(out)
            return self.blob(200,out.getvalue(),'image/svg+xml; charset=utf-8')
        if url.path in STATIC:
            file=ROOT/STATIC[url.path]
            if not file.is_file():return self.json_response(404,{'error':'File not available.'})
            return self.blob(200,file.read_bytes(),MIME[file.suffix])
        return self.json_response(404,{'error':'Not found.'})
    def do_POST(self):
        if not self.cors_ok(): return self.json_response(403,{'error':'Origin refuzat.'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=MAX_POST: return self.json_response(413,{'error':'Request prea mare sau gol.'})
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict): raise ValueError('Invalid request')
            path=urlparse(self.path).path
            if path=='/api/create':
                # On a LAN, only the local professor may create games by default.
                # Cloud deployments may opt into remote creation via a private admin key.
                admin_key=getattr(self.server,'admin_key','')
                if self.client_address[0] not in ('127.0.0.1','::1'):
                    supplied=data.get('admin_key','')
                    if not (admin_key and isinstance(supplied,str) and
                            secrets.compare_digest(admin_key,supplied)):
                        return self.json_response(403,{'error':'Sesiunea poate fi creată doar local sau cu cheia de administrator configurată pe server.'})
                s=STORE.new(clamp_int(data.get('count'),1,len(QUESTIONS),10),clamp_int(data.get('duration'),10,90,25))
                public=self.server.public_url
                if not public:public='http://%s:%d'%(self.server.lan_ip,self.server.server_port)
                return self.json_response(200,{'pin':s['pin'],'token':s['key'],
                    'join_url':public.rstrip('/')+'/join?pin='+s['pin']})
            if path=='/api/join': return self.json_response(200,STORE.join(str(data.get('pin','')),data.get('name','')))
            if path=='/api/state':
                return self.json_response(200,STORE.get_state(str(data.get('pin','')),data.get('role',''),
                                  data.get('id'),data.get('token')))
            if path=='/api/answer':
                return self.json_response(200,STORE.submit(str(data.get('pin','')),data.get('id'),
                                  data.get('token'),data.get('index'),data.get('choice')))
            if path=='/api/action':
                return self.json_response(200,STORE.action(str(data.get('pin','')),data.get('token'),data.get('action')))
            return self.json_response(404,{'error':'API necunoscut.'})
        except PermissionError as ex: return self.json_response(403,{'error':str(ex)})
        except (ValueError,KeyError,TypeError) as ex: return self.json_response(400,{'error':str(ex)})
        except Exception as ex:
            print('Error in handler:',repr(ex), file=sys.stderr)
            return self.json_response(500,{'error':'Eroare internă.'})

class ArenaServer(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True

def detect_ip():
    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    try:
        s.connect(('1.1.1.1',80));return s.getsockname()[0]
    except OSError: return '127.0.0.1'
    finally:s.close()

def normalize_public_url(explicit=''):
    """Prefer an explicit URL, otherwise derive Render's trusted public hostname."""
    if explicit:
        return explicit.rstrip('/')
    hostname = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '')
    if hostname and re.fullmatch(r'[a-zA-Z0-9.-]+', hostname) and hostname.endswith('.onrender.com'):
        return 'https://' + hostname
    return ''

def start_server(host='0.0.0.0',port=8798,public_url=''):
    server=ArenaServer((host,port),Handler)
    server.public_url=normalize_public_url(public_url)
    server.admin_key=os.environ.get('ARENA_ADMIN_KEY','')
    server.lan_ip=detect_ip()
    return server

def main():
    parser=argparse.ArgumentParser(description='GIT//LAB ARENA — multi-player Git quiz')
    parser.add_argument('--host',default='0.0.0.0')
    parser.add_argument('--port',type=int,default=int(os.environ.get('PORT','8798')))
    parser.add_argument('--public-url',default=os.environ.get('PUBLIC_URL',''),help='URL visible to students, e.g. https://...trycloudflare.com')
    args=parser.parse_args()
    if args.public_url and not args.public_url.startswith(('https://','http://')): parser.error('--public-url requires http(s)://')
    server=start_server(args.host,args.port,args.public_url)
    print('\n✦ GIT//LAB ARENA · ONLINE READY')
    print('PROFESOR (PC): http://127.0.0.1:%d/'%server.server_port)
    print('STUDENȚI (Wi-Fi comun): http://%s:%d/join'%(server.lan_ip,server.server_port))
    if server.public_url:print('PUBLIC:',server.public_url)
    if server.admin_key:print('Remote host creation enabled with ARENA_ADMIN_KEY.')
    print('Game server ține datele doar în memorie. CTRL+C pentru oprire.\n')
    try:server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
