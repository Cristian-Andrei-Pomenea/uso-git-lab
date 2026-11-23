"""Browser smoke/regression tests for Git//LAB 08. Requires playwright and system chromium."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import pytest

HTML = (Path(__file__).parents[1] / 'GIT-LAB-08-OFFLINE.html').read_text()

@pytest.fixture
def demo():
    with sync_playwright() as p:
        chromium = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
        options = {'headless': True, 'args':['--no-sandbox', '--disable-dev-shm-usage']}
        if Path(chromium).is_file(): options['executable_path'] = chromium
        browser = p.chromium.launch(**options)
        page = browser.new_page(viewport={'width': 1500, 'height': 1000})
        errs = []
        page.on('pageerror', lambda error: errs.append(str(error)))
        page.set_content(HTML)
        yield page
        assert not errs, f'JavaScript errors: {errs}'
        browser.close()

def run(page, *cmds):
    for cmd in cmds:
        page.evaluate('(cmd) => GitLab.execute(cmd)', cmd)

def state(page):
    return page.evaluate('GitLab.getState()')

def test_first_commit(demo):
    s=state(demo)
    assert s['scene']=='start' and not s['commits']
    run(demo, 'git status', 'git add README.md', 'git commit -m "Add README"')
    assert state(demo)['mission']==3
    assert state(demo)['remote']['main'] is None
    run(demo, 'git push -u origin main')
    s=state(demo)
    assert s['mission']==4
    assert s['remote']['main']==s['branches']['main']
    assert len(s['commits'])==1

def test_branch_merge(demo):
    demo.evaluate("GitLab.reset('branch')")
    run(demo, 'git switch -c feature/ignore', 'echo "*.o" > .gitignore', 'git add .gitignore',
        'git commit -m "Ignore object files"', 'git switch main', 'git merge feature/ignore')
    s=state(demo)
    assert s['mission']==6
    assert s['branches']['main']==s['branches']['feature/ignore']
    assert len(s['commits'])==2
    assert s['files']['.gitignore']=='*.o\n'

def test_pr_review_ci_remote_merge_and_local_pull(demo):
    demo.evaluate("GitLab.reset('pr')")
    run(demo, 'git add .', 'git commit -m "Add Bubble Sort"',
        'git push -u origin feature/bubble-sort', 'pr create')
    s=state(demo)
    assert s['mission']==4 and s['pr']['status']=='open'
    run(demo,'pr merge')
    assert state(demo)['pr']['status']=='open'  # requires review + CI
    run(demo,'pr approve', 'ci run')
    demo.wait_for_timeout(950)
    s=state(demo)
    assert s['ci']=='passed' and s['mission']==6
    run(demo,'pr merge')
    s=state(demo)
    assert s['pr']['status']=='merged' and s['mission']==7
    assert s['branches']['main']!=s['remote']['main']
    run(demo,'git switch main && git pull origin main')
    s=state(demo)
    assert s['mission']==8 and s['branches']['main']==s['remote']['main']
    assert 'bubble-sort.c' in s['files']

def test_conflict_resolution(demo):
    demo.evaluate("GitLab.reset('conflict')")
    run(demo,'git pull origin main')
    s=state(demo)
    assert s['mission']==1 and 'README.md' in s['merge']['conflicts']
    assert '<<<<<<< HEAD' in s['files']['README.md']
    run(demo,'git commit -m "should fail"')
    assert state(demo)['mission']==1
    run(demo,'resolve README.md', 'git add README.md','git commit -m "Resolve merge conflict"','git log --oneline --graph --all')
    s=state(demo)
    assert s['mission']==5 and s['merge'] is None
    assert len(s['commits'][s['branches']['main']]['parents'])==2
    assert '<<<<<<<' not in s['files']['README.md']

def test_file_editor_and_simulated_command_only(demo):
    assert demo.locator('#btnMissionAction').is_hidden()
    demo.locator('#fileContent').fill('# changed in editor\n')
    demo.locator('#btnSaveFile').click()
    assert state(demo)['files']['README.md']=='# changed in editor\n'
    run(demo,'git add README.md')
    s=state(demo)
    assert s['staged']['README.md']=='# changed in editor\n'
    run(demo,'git restore --staged README.md')
    assert state(demo)['staged']=={}
    run(demo,'rm -rf /')
    assert state(demo)['files']['README.md']=='# changed in editor\n'

def test_quiz_and_mobile(demo):
    demo.locator('button[data-scenario="quiz"]').click()
    assert demo.locator('#quizDialog').evaluate('(x)=>x.open')
    demo.locator('#quizAnswers button').nth(1).click()
    assert 'Corect!' in demo.locator('#quizFeedback').inner_text()
    demo.locator('#quizNext').click()
    assert '02 / 05' in demo.locator('#quizProgress').inner_text()
    demo.locator('#quizDialog button[data-close]').click()
    assert not demo.locator('#quizDialog').evaluate('(x)=>x.open')
    demo.set_viewport_size({'width':390,'height':844})
    assert demo.locator('#terminalForm').is_visible()
    assert demo.locator('.scene[data-scenario="start"]').is_visible()
