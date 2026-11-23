"""Integration tests using actual HTTP for the zero-dependency classroom multiplayer backend."""
import json
import threading
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import pytest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parents[1]))
from live_quiz_server import QUESTIONS, start_server, normalize_public_url

@pytest.fixture
def arena():
    server = start_server('127.0.0.1', 0, '')
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_port}'
    def req(endpoint, data=None, headers=None):
        body = json.dumps(data).encode() if data is not None else None
        request = Request(url + endpoint, data=body, headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            with urlopen(request, timeout=5) as response:
                content = response.read()
                return response.status, json.loads(content) if endpoint.startswith('/api/') and not endpoint.startswith('/api/qr') else content
        except HTTPError as e:
            return e.code, json.loads(e.read())
    yield req
    server.shutdown()
    server.server_close()
    thread.join(timeout=4)

def create(req, count=4, duration=25):
    code, result = req('/api/create', {'count': count, 'duration': duration})
    assert code == 200
    return result

def join(req, game, name):
    code, result = req('/api/join', {'pin':game['pin'], 'name':name})
    assert code == 200
    return result

def state(req, game, person=None):
    if person:
        code, result = req('/api/state', {'role':'player', 'pin':game['pin'], 'id':person['id'], 'token':person['token']})
    else:
        code, result = req('/api/state', {'role':'host', 'pin':game['pin'], 'token':game['token']})
    assert code == 200, result
    return result

def action(req, game, command):
    return req('/api/action', {'pin':game['pin'], 'token':game['token'], 'action':command})

def answer(req, game, p, idx, choice):
    return req('/api/answer', {'pin':game['pin'], 'id':p['id'], 'token':p['token'], 'index':idx, 'choice':choice})


def test_health_and_static(arena):
    assert arena('/api/health')[1]['questions'] == len(QUESTIONS)
    for path in ('/','/index.html','/arena','/join','/masterclass.html','/arena.js','/join.js','/masterclass.js'):
        code, _ = arena(path)
        assert code == 200, path
    for secret in ('/live_quiz_server.py','/questions.json','/../live_quiz_server.py'):
        assert arena(secret)[0] == 404

def test_create_qr_and_join_lobby(arena):
    game = create(arena)
    assert len(game['pin']) == 6 and game['token'] and 'join?pin=' in game['join_url']
    code, xml = arena('/api/qr?pin=' + game['pin'])
    assert code == 200 and b'<svg' in xml and len(xml) > 300
    p = join(arena, game, 'Alice')
    q = join(arena, game, 'Bob')
    host = state(arena, game)
    assert host['phase'] == 'lobby' and host['players'] == 2
    assert host['names'] == ['Alice','Bob']
    assert state(arena, game, p)['leaderboard'] == []

def test_correct_vs_wrong_speed_leaderboard(arena):
    game = create(arena, 2, 30)
    a, b = join(arena,game,'Alice'), join(arena,game,'Bob')
    assert action(arena, game,'next')[0] == 200
    host = state(arena,game)
    q = host['question']
    correct=q['correct']
    assert 'correct' not in state(arena,game,a)['question']
    assert answer(arena,game,a,0,correct)[0] == 200
    assert state(arena,game)['phase'] == 'question'
    assert answer(arena,game,b,0,(correct+1)%4)[0] == 200
    host = state(arena,game)
    assert host['phase'] == 'reveal'
    assert host['leaderboard'][0]['name'] == 'Alice'
    assert 500 <= host['leaderboard'][0]['points'] <= 1000
    assert host['leaderboard'][1]['points'] == 0
    assert host['distribution'][correct] == 1
    assert state(arena,game,a)['me']['isCorrect'] is True
    assert state(arena,game,b)['me']['isCorrect'] is False
    assert action(arena, game, 'next')[0] == 200
    assert state(arena, game)['index'] == 1
    assert action(arena, game, 'reveal')[0] == 200
    assert action(arena, game, 'next')[0] == 200
    assert state(arena, game)['phase'] == 'finished'

def test_protect_roles_cheat_and_implicit_validation(arena):
    game = create(arena)
    p=join(arena,game,'Xavier')
    assert arena('/api/state', {'role':'host','pin':game['pin'],'token':'bad'})[0] == 403
    assert arena('/api/state', {'role':'player','pin':game['pin'],'id':p['id'],'token':'bad'})[0] == 403
    assert arena('/api/action', {'pin':game['pin'],'token':p['token'],'action':'next'})[0] == 403
    assert arena('/api/answer', {'pin':game['pin'],'id':p['id'],'token':p['token'],'index':0,'choice':0})[0] == 400
    assert action(arena,game,'next')[0] == 200
    assert arena('/api/join', {'pin':game['pin'],'name':'Later'})[0] == 400
    assert arena('/api/join', {'pin':game['pin'],'name':'<script>'})[0] == 400
    assert answer(arena,game,p,0,True)[0] == 400
    assert answer(arena,game,p,0,10)[0] == 400
    assert answer(arena,game,p,5,0)[0] == 400
    assert answer(arena,game,p,0,0)[0] == 200
    assert answer(arena,game,p,0,0)[0] == 400

def test_names_restrictions_and_remote_session_policy(arena):
    game=create(arena)
    join(arena,game,'Alice')
    assert arena('/api/join',{'pin':game['pin'],'name':'alice'})[0] == 400
    assert arena('/api/join',{'pin':game['pin'],'name':' '})[0] == 400
    code, result = arena('/api/create',{'count':1},headers={'Origin':'https://random.invalid'})
    assert code == 403
    assert 'Origin' in result['error']
    code, result = arena('/api/create',{'count':10000, 'duration':-50})
    assert code == 200
    host=state(arena,result)
    assert host['total'] == len(QUESTIONS)

def test_questions_validated():
    assert len(QUESTIONS) >= 15
    for i, q in enumerate(QUESTIONS):
        assert len(q['options']) == 4, i
        assert isinstance(q['correct'],int) and 0 <= q['correct'] < 4, i
        assert all(isinstance(x,str) and x.strip() for x in q['options']), i
        assert q['question'].strip() and q['explain'].strip(), i


def test_public_url_for_hosting(monkeypatch):
    monkeypatch.setenv('RENDER_EXTERNAL_HOSTNAME', 'uso-git-lab-arena.onrender.com')
    assert normalize_public_url() == 'https://uso-git-lab-arena.onrender.com'
    assert normalize_public_url('https://quiz.example.org///') == 'https://quiz.example.org'
    monkeypatch.setenv('RENDER_EXTERNAL_HOSTNAME', 'evil.com/redirect')
    assert normalize_public_url() == ''
