"""Real Git sandbox: merge conflicts, safety allowlist, and isolation regression tests."""
from pathlib import Path
import sys
import pytest
sys.path.insert(0, str(Path(__file__).parents[1]))
from real_git_server import GitSandbox

@pytest.fixture
def sandbox():
    s=GitSandbox()
    yield s
    root=s.root
    s.close()
    assert not root.exists(), 'Temp sandbox was not cleaned up.'

def cmd(s, actor, instruction):
    result=s.run(actor,instruction)
    assert result['ok'], f'{actor}: {instruction}: {result["output"]}'
    return result['output']

def test_initial_and_branch_remote(sandbox):
    s=sandbox
    assert (s.root/'alice'/'README.md').is_file()
    assert 'main' in cmd(s,'alice','git branch')
    cmd(s,'alice','git switch -c feature/readme')
    cmd(s,'alice','echo "Feature branch test" >> README.md')
    assert 'modified' in cmd(s,'alice','git status')
    cmd(s,'alice','git add README.md')
    cmd(s,'alice','git commit -m "Update README from Alice"')
    assert 'feature/readme' in cmd(s,'alice','git branch')
    cmd(s,'alice','git push -u origin feature/readme')
    assert 'feature/readme' in s.snapshot('alice')['remote']

def test_conflict_and_resolution_across_real_clones(sandbox):
    s=sandbox
    # Two authors edit the SAME text in different ways, producing a real conflict.
    cmd(s,'alice','echo "Alice changed content" > README.md')
    cmd(s,'alice','git add README.md')
    cmd(s,'alice','git commit -m "Alice edit"')
    cmd(s,'alice','git push origin main')
    cmd(s,'bob','echo "Bob changed content" > README.md')
    cmd(s,'bob','git add README.md')
    cmd(s,'bob','git commit -m "Bob edit"')
    result=s.run('bob','git pull origin main')
    assert not result['ok'] and 'CONFLICT' in result['output']
    assert '<<<<<<< HEAD' in (s.root/'bob'/'README.md').read_text()
    cmd(s,'bob','echo "Alice and Bob resolved" > README.md')
    cmd(s,'bob','git add README.md')
    cmd(s,'bob','git commit -m "Resolve conflict"')
    history=cmd(s,'bob','git log --oneline --graph --all')
    assert 'Resolve conflict' in history
    assert len(s.snapshot('bob')['commits']) >= 4
    assert '<<<<<<<' not in (s.root/'bob'/'README.md').read_text()

def test_disallow_arbitrary_shell_and_git_options(sandbox):
    s=sandbox
    forbidden=('rm -rf /', 'git -c core.hooksPath=/tmp status',
               'git config --global user.name Bad',
               'git push --force origin main',
               'git clone https://example.org/repo',
               'cat ../../etc/passwd',
               'echo "bad" > .git/config',
               'git checkout -- ../outside',
               'git commit -m "foo\nbar"')
    for line in forbidden:
        result=s.run('alice',line)
        assert result['ok'] is False, (line,result)
    assert s.run('eve','git status')['ok'] is False
    assert s.run('alice','git status')['ok'] is True

def test_reset_keeps_the_real_git_workspace_isolated(sandbox, tmp_path):
    s=sandbox
    external=tmp_path/'not-a-repo.txt'; external.write_text('keep me')
    cmd(s,'bob','echo "temporary edit" > notes.txt')
    assert (s.root/'bob'/'notes.txt').exists()
    s.reset()
    assert not (s.root/'bob'/'notes.txt').exists()
    assert external.read_text()=='keep me'
    assert s.snapshot('alice')['actors']['alice']['branch']=='main'
