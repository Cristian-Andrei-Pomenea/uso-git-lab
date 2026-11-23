/* Git//LAB 08 — self-contained educational Git simulator. Nothing here calls Git or GitHub. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=o=>JSON.parse(JSON.stringify(o));
const fresh=()=>({scene:'start', initialized:true, current:'main', branches:{main:null}, remote:{main:null}, tracking:{main:null}, commits:{}, next:1, files:{}, staged:{}, merge:null, pr:null, ci:'idle', review:false, history:[], histAt:0, mission:0, score:0, eventLog:[]});
let S=fresh(), ciTimer=0, quizIndex=0, quizPoints=0, quizAnswered=false;
const scenes={
 start:{title:'ACTUL I: PRIMUL COMMIT',level:'01',name:'01 / Primul commit',intro:'Ai un README neversionat. Transformă-l în primul snapshot și publică-l.',missions:[
  ['Inspectează repository-ul','README există pe disc, dar Git nu îl urmărește încă. Ce status are?', 'git status','Untracked înseamnă că fișierul există pe disc, dar nu a fost adăugat încă în istoric.',e=>e==='status'],
  ['Alege ce salvezi','Adaugă README.md în staging area. Nu este încă un commit.', 'git add README.md','git add pune o versiune a fișierului în index (staging), nu publică nimic.',e=>e==='stage'],
  ['Creează snapshot-ul','Înregistrează primul commit local cu un mesaj descriptiv.', 'git commit -m "Add README"','Un commit include conținutul staged, mesajul, autorul și legăturile către părinți.',e=>e==='commit'],
  ['Publică pe GitHub','Acum trimite commit-ul local către origin/main.', 'git push -u origin main','push transferă commit-uri; commit singur nu actualizează GitHub.',e=>e==='push'],
 ]},
 branch:{title:'ACTUL II: PARALLEL WORLDS',level:'02',name:'02 / Branch-uri și merge',intro:'Experimentează pe alt branch, fără să modifici imediat main.',missions:[
  ['Deschide o lume paralelă','Creează și selectează un branch nou.', 'git switch -c feature/ignore','Branch-urile sunt referințe către commit-uri, nu directoare separate.',e=>e==='switchNew'],
  ['Creează un .gitignore','Adaugă o regulă pentru fișierele .o generate la compilare.', 'echo "*.o" > .gitignore','.gitignore afectează fișierele ignorate NEURMĂRITE; nu șterge din repo ce este deja tracked.',e=>e==='edit'],
  ['Pune-l în staging','Selectează fișierul .gitignore pentru următorul snapshot.', 'git add .gitignore','Staging ≠ commit; verifică git status după fiecare pas.',e=>e==='stage'],
  ['Salvează pe feature','Creează un commit pe branch-ul separat.', 'git commit -m "Ignore object files"','HEAD urmărește branch-ul curent; commit-ul mută referința acelui branch.',e=>e==='commit'],
  ['Revenire pe main','Schimbă branch-ul înainte să integrezi modificările.', 'git switch main','Schimbarea branch-ului actualizează de regulă și fișierele din working tree.',e=>e==='switchMain'],
  ['Unește lumile','Fă merge din feature/ignore în main.', 'git merge feature/ignore','Aici merge-ul e fast-forward: main poate avansa fără commit de merge nou.',e=>e==='merge'],
 ]},
 pr:{title:'ACTUL III: CODE REVIEW',level:'03',name:'03 / Pull request',intro:'Ai lucrat la o funcționalitate. Public-o, deschide un PR și aprobă integrarea.',missions:[
  ['Selectează modificările','Fișierele pentru Bubble Sort sunt deja modificate în working tree.', 'git add .','Un Pull Request compară două branch-uri de pe GitHub.',e=>e==='stage'],
  ['Commit pe feature','Salvează modificările pe feature/bubble-sort.', 'git commit -m "Add Bubble Sort"','Un mesaj bun spune ce schimbă commit-ul, nu doar „update”.',e=>e==='commit'],
  ['Publică branch-ul','Trimite feature/bubble-sort către origin.', 'git push -u origin feature/bubble-sort','Fără push, GitHub nu vede commit-urile locale.',e=>e==='push'],
  ['Deschide Pull Request','Simulatorul folosește comanda specială pr create (nu este comandă Git).', 'pr create','GitHub PR: propunere de integrare + diff + discuții + review.',e=>e==='prCreate'],
  ['Solicită review','Aprobă modificările ca un colaborator.', 'pr approve','Review-ul este un pas de colaborare; aprobarea nu face merge.',e=>e==='approve'],
  ['Lansează verificările','Rulează două verificări didactice simulate.', 'ci run','Într-un proiect real, GitHub Actions rulează job-uri definite în YAML.',e=>e==='ciPassed'],
  ['Integrează în remote','Fă merge PR-ului pe origin/main.', 'pr merge','Merge-ul PR este făcut pe server; main local încă poate fi în urmă.',e=>e==='prMerge'],
  ['Adu schimbarea local','Selectează main și actualizează-l din origin/main.', 'git switch main && git pull origin main','pull înseamnă fetch + integrare. În demo folosim fast-forward dacă este posibil.',e=>e==='pull'],
 ]},
 conflict:{title:'ACTUL IV: MERGE DISASTER',level:'04',name:'04 / Conflict resolution',intro:'Tu și un coleg ați schimbat ACEEAȘI linie. Git cere intervenție umană.',missions:[
  ['Declanșează conflictul','Încearcă să aduci în main contribuția colegului de pe origin/main.', 'git pull origin main','Când ambele ramuri schimbă același conținut, Git poate genera conflict.',e=>e==='conflict'],
  ['Repară fișierul','Rescrie README astfel încât să nu mai conțină delimitatorii <<<<<<< / ======= / >>>>>>>.', 'resolve README.md','Păstrează ce e bun din ambele versiuni. În demo, resolve este o scurtătură didactică.',e=>e==='resolve'],
  ['Marchează rezolvat','Spune-i lui Git că fișierul corectat este gata.', 'git add README.md','git add marchează drept rezolvat fișierul fără conflict markers.',e=>e==='stage'],
  ['Finalizează merge-ul','Fă un commit cu doi părinți — cele două linii de istoric.', 'git commit -m "Resolve merge conflict"','Un merge commit păstrează legăturile către ambele istorice.',e=>e==='commit'],
  ['Inspectează rezultatul','Afișează graful textual cu ramurile istoriei.', 'git log --oneline --graph --all','Poți vedea și vizual: două linii de istoric se reunesc.',e=>e==='log'],
 ]},
 quiz:{title:'BOSS FIGHT',level:'★',name:'BONUS / Git Quiz',intro:'Cinci întrebări, cinci capcane frecvente.',missions:[]}
};
const help=[
 ['git status','Fișiere untracked, staged, modificate și conflicte.'],['git add <fișier> / git add .','Adaugă modificările curente în staging.'],['git commit -m "mesaj"','Creează un snapshot local din staging.'],['git log --oneline --graph --all','Afișează istoricul commit-urilor.'],['git branch / git switch -c nume','Listează sau creează un branch.'],['git switch main / git checkout main','Mută HEAD pe alt branch.'],['git merge nume','Integrează branch-ul în cel curent.'],['git push -u origin branch','Publică branch-ul pe remote.'],['git fetch origin / git pull origin main','Preia / integrează commit-uri remote.'],['git diff / git diff --cached','Vezi modificări nestaged / staged.'],['echo "text" > fișier','Editează un fișier (sau >> pentru adăugare).'],['ls -a / cat README.md','Vezi fișierele curente / conținutul unui fișier.'],['git restore --staged fișier','Scoate fișierul din staging.'],['git branch -d nume','Șterge un branch local integrat.'],['pr create / pr approve / pr merge','Comenzi INVENTATE de simulator pentru un PR GitHub.'],['ci run / resolve README.md','Scurtături DIDACTICE, nu comenzi Git reale.'],['git merge --abort','Anulează un merge local aflat în conflict.'],['clear / help','Curăță terminalul / afișează acest ghid.']
];
const quiz=[
 {q:'Ai rulat git commit, dar colegii nu văd modificările. Ce lipsește?',a:['git add','git push','git branch'],correct:1,why:'Commit-ul este local. Pentru sincronizare cu remote: git push.'},
 {q:'Ce salvează git add README.md?',a:['Versiunea actuală a README în staging','Un commit permanent','Tot repository-ul pe GitHub'],correct:0,why:'git add pregătește indexul. Commit-ul îl creezi separat.'},
 {q:'Ce indică HEAD într-un repo Git normal?',a:['Ultimul fișier modificat','Branch-ul sau commit-ul selectat','Adresa contului GitHub'],correct:1,why:'În mod uzual HEAD este o referință simbolică la branch-ul curent.'},
 {q:'Când apare conflictul de merge?',a:['De fiecare dată când faci push','Când Git nu poate combina automat schimbările','Când un branch are nume prea lung'],correct:1,why:'Conflictele apar doar când Git nu poate hotărî singur cum se combină anumite schimbări.'},
 {q:'PR-ul aprobat în GitHub modifică automat proiectul local?',a:['Da, imediat','Nu, trebuie integrat și apoi sincronizat local','Doar dacă există .gitignore'],correct:1,why:'Aprobare ≠ merge; merge pe GitHub ≠ actualizare automată a clonei locale.'}
];
function makeCommit(msg,parents,files,hint){const n=S.next++;const id=(0xabc1000+n*0x1afd).toString(16).slice(-7);S.commits[id]={id,index:n,msg,parents:parents.filter(Boolean),files:clone(files),hint:hint||S.current};return id}
function head(branch=S.current){return S.branches[branch]??null}
function tree(id=head()){return id&&S.commits[id]?clone(S.commits[id].files):{}}
function stageTree(){let t=tree();for(const [k,v] of Object.entries(S.staged)){if(v===null)delete t[k];else t[k]=v}return t}
function isIgnored(name){const ignore=S.files['.gitignore']||'';return ignore.split(/\r?\n/).filter(Boolean).some(p=>p==='*.o'&&name.endsWith('.o')||p==='build/'&&name.startsWith('build/')||p===name)}
function differences(){let base=tree(),staged=stageTree(),all=new Set([...Object.keys(base),...Object.keys(staged),...Object.keys(S.files)]),work=[],stage=[],untracked=[];
 for(const k of all){let b=own(base,k)?base[k]:undefined,st=own(staged,k)?staged[k]:undefined,w=own(S.files,k)?S.files[k]:undefined;
  if(b!==st)stage.push(k);
  if(st!==w){if(b===undefined&&st===undefined&&w!==undefined){if(!isIgnored(k))untracked.push(k)}else work.push(k)}
 }
 return {work,stage,untracked};}
function dirty(){const d=differences();return !!(d.work.length||d.stage.length||d.untracked.length||S.merge)}
function isAncestor(a,b){if(!a)return true;if(!b)return false;if(a===b)return true;const seen=new Set();const walk=id=>{if(!id||seen.has(id))return false;if(id===a)return true;seen.add(id);return S.commits[id]&&S.commits[id].parents.some(walk)};return !!walk(b)}
function ancestors(id,depth=0,dist={}){if(!id||!S.commits[id])return dist;if(own(dist,id)&&dist[id]<=depth)return dist;dist[id]=depth;S.commits[id].parents.forEach(x=>ancestors(x,depth+1,dist));return dist}
function baseOf(a,b){const aa=ancestors(a),bb=ancestors(b);return Object.keys(aa).filter(x=>own(bb,x)).sort((x,y)=>(aa[x]+bb[x])-(aa[y]+bb[y]))[0]||null}
function combineTrees(fromId,toId){const base=tree(baseOf(fromId,toId)),ours=tree(fromId),theirs=tree(toId),all=new Set([...Object.keys(base),...Object.keys(ours),...Object.keys(theirs)]),out={},conflicts=[];
 for(const k of all){let b=own(base,k)?base[k]:undefined,a=own(ours,k)?ours[k]:undefined,z=own(theirs,k)?theirs[k]:undefined,v;
  if(a===z)v=a;else if(a===b)v=z;else if(z===b)v=a;else {conflicts.push(k);v=`<<<<<<< HEAD\n${a||''}\n=======\n${z||''}\n>>>>>>> origin/main\n`}
  if(v!==undefined)out[k]=v;
 }
 return {out,conflicts};}
function seedBase(){S.files={'README.md':'# Sorting Algorithms for Beginners\n\nTrei algoritmi de sortare în C.\n'};let id=makeCommit('Initial README',[],S.files,'main');S.branches.main=id;S.remote.main=id;S.tracking.main=id;return id}
function reset(scene='start'){
 clearTimeout(ciTimer);S=fresh();S.scene=scene;
 if(scene==='start')S.files={'README.md':'# Sorting Algorithms for Beginners\n'};
 if(scene==='branch'){seedBase();}
 if(scene==='pr'){let id=seedBase();S.current='feature/bubble-sort';S.branches[S.current]=id;S.files={...tree(id),'README.md':tree(id)['README.md']+'\n## Bubble Sort\nSortează crescător un vector de numere întregi.\n','bubble-sort.c':'#include <stdio.h>\n\nvoid bubble_sort(int a[], int n) {\n  for (int i = 0; i < n; i++)\n    for (int j = 0; j + 1 < n; j++)\n      if (a[j] > a[j+1]) {\n        int t = a[j]; a[j] = a[j+1]; a[j+1] = t;\n      }\n}\n'};}
 if(scene==='conflict'){let root=seedBase();let a=makeCommit('Local: rewrite the README',[root],{'README.md':'# Sorting Algorithms\n\nDescriere de pe laptop: algoritmi în C.\n'},'main');let b=makeCommit('Remote: teammate edits README',[root],{'README.md':'# Sorting Algorithms\n\nDescriere de la coleg: explicații și exemple.\n'},'origin/main');S.branches.main=a;S.remote.main=b;S.tracking.main=root;S.files=tree(a);}
 S.mission=0;S.score=0;S.eventLog=[];
 document.querySelectorAll('.scene').forEach(x=>x.classList.toggle('active',x.dataset.scenario===scene));$('activeScenarioLabel').textContent=scenes[scene].title;
 $('terminalScreen').replaceChildren();out('┌──────────────────────────────────────────┐','ascii');out('│  GIT//LAB 08   ◆   THE GIT UNIVERSE     │','ascii');out('└──────────────────────────────────────────┘','ascii');out('Simulator offline. Nicio comandă nu afectează calculatorul sau GitHub.', 'muted');out('Scenariu: '+scenes[scene].name+'. Tastează help pentru comenzi.','info');
 if(scene==='conflict')out('ALERT: main local și origin/main au evoluat separat. Încearcă git pull origin main.','warn');
 if(scene==='pr')out('WORKTREE: README.md și bubble-sort.c conțin schimbări neînregistrate.','warn');
 if(scene==='branch')out('ROOT COMMIT: main și origin/main arată către aceeași versiune.','ok');
 render(true);
}
function out(msg,type='normal'){let box=$('terminalScreen');for(const line of String(msg).split('\n')){let el=document.createElement('div');el.className='terminal-line '+type;el.textContent=line||' ';box.append(el)}box.scrollTop=box.scrollHeight;if(box.children.length>240)while(box.children.length>200)box.firstElementChild.remove();}
function note(msg,special=false){const t=document.createElement('div');t.className='toast'+(special?' special':'');t.innerHTML='<strong>'+(special?'✦ ACHIEVEMENT UNLOCKED':'◈ SYSTEM MESSAGE')+'</strong>'+esc(msg);$('toasts').append(t);setTimeout(()=>t.remove(),3500)}
function celebrate(){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(let i=0;i<32;i++){const c=document.createElement('span');c.className='confetti';c.style.left=(18+Math.random()*65)+'vw';c.style.top='-18px';c.style.setProperty('--delay',(Math.random()*.6)+'s');c.style.setProperty('--duration',(1.3+Math.random()*1.5)+'s');c.style.setProperty('--tilt',(-170+Math.random()*340)+'px');c.style.background=['#65e6f4','#a8ffbf','#f784d6','#ffdb9c','#9994ff'][i%5];document.body.append(c);setTimeout(()=>c.remove(),3200)}
}
function event(type){S.eventLog.push(type);const list=scenes[S.scene].missions;const m=list[S.mission];if(m&&m[4](type)){
  S.mission++;S.score+=100;note('+'+100+' XP · '+(S.mission===list.length?'SCENARIU COMPLET!':'Obiectiv îndeplinit'),S.mission===list.length);
  if(S.mission===list.length)celebrate();
  if(S.mission===list.length)out('✦ MISSION COMPLETE — ai terminat scenariul! Poți explora liber sau alege actul următor.','ok');
 }render();}
function shellArgs(src){let arr=[],buf='',quote='',escaped=false;for(let i=0;i<src.length;i++){const c=src[i];if(escaped){buf+=c;escaped=false;continue}if(c==='\\'&&quote!="'"){escaped=true;continue}if(quote){if(c===quote){quote='';continue}buf+=c;continue}if(c==='"'||c==="'"){quote=c;continue}if(/\s/.test(c)){if(buf){arr.push(buf);buf=''}continue}buf+=c}if(quote)return null;if(buf)arr.push(buf);return arr}
const error=x=>({txt:x,kind:'error'}),ok=(x,e)=>({txt:x,kind:'ok',event:e}),info=x=>({txt:x,kind:'info'}),warn=x=>({txt:x,kind:'warn'});
function gitStatus(){const d=differences(),b=S.current,local=head(),remote=S.tracking[b];let rows=[`On branch ${b}`];if(S.merge)rows.push('You have unmerged paths. Resolve conflicts, git add, then git commit.');
 if(remote&&local){if(local===remote)rows.push(`Your branch is up to date with 'origin/${b}'.`);else if(isAncestor(remote,local))rows.push('Your branch is ahead of origin/'+b+'.');else if(isAncestor(local,remote))rows.push('Your branch is behind origin/'+b+'.');else rows.push('Your branch and origin/'+b+' have diverged.');}
 if(d.stage.length)rows.push('\nChanges to be committed:\n'+d.stage.map(x=>'  '+(own(tree(),x)?(own(stageTree(),x)?'modified':'deleted'):'new file')+': '+x).join('\n'));
 if(d.work.length)rows.push('\nChanges not staged for commit:\n'+d.work.map(x=>'  modified: '+x).join('\n'));
 if(d.untracked.length)rows.push('\nUntracked files:\n'+d.untracked.map(x=>'  '+x).join('\n'));
 if(!d.stage.length&&!d.work.length&&!d.untracked.length&&!S.merge)rows.push(!local?'No commits yet. Nothing to commit.':'nothing to commit, working tree clean');
 if(S.merge?.conflicts.length)rows.push('\nUnmerged paths: '+S.merge.conflicts.join(', '));
 return rows.join('\n');}
function gitLog(){const objs=Object.values(S.commits).sort((a,b)=>b.index-a.index).slice(0,27);if(!objs.length)return 'No commits yet.';
 let rows=[];for(const c of objs){const refs=[];for(const [n,id] of Object.entries(S.branches))if(id===c.id)refs.push((n===S.current?'HEAD → ':'')+n);for(const [n,id] of Object.entries(S.remote))if(id===c.id)refs.push('origin/'+n);rows.push((c.parents.length>1?'*↘ ' : '* ')+c.id+' '+c.msg+(refs.length?' ('+refs.join(', ')+')':''));}return rows.join('\n');}
function validateBranch(n){return /^[a-zA-Z0-9][\w./-]*$/.test(n)&&!n.includes('..')&&!n.endsWith('/')&&!n.endsWith('.lock')}
function runGit(args){let sub=args[0],rest=args.slice(1);if(!sub)return error('usage: git <command>');
 switch(sub){
 case 'init':{if(S.initialized)return info('Reinitialized existing Git repository in ./git-lab/.git/');S.initialized=true;return ok('Initialized empty Git repository in ./git-lab/.git/','init');}
 case 'status':return ok(gitStatus(),'status');
 case 'add':{if(!rest.length)return error('Nothing specified, nothing added.');const paths=rest.some(x=>['.','-A','--all'].includes(x))?[...new Set([...Object.keys(S.files),...Object.keys(tree()),...Object.keys(S.staged)])]:rest.filter(x=>!x.startsWith('-'));let found=[];
   for(let p of paths){if(!own(S.files,p)&&!own(tree(),p)&&!own(S.staged,p))continue;if(isIgnored(p)&&!own(tree(),p)&&!own(S.staged,p))continue;let v=own(S.files,p)?S.files[p]:null;if(v===(own(tree(),p)?tree()[p]:null))delete S.staged[p];else S.staged[p]=v;found.push(p);if(S.merge?.conflicts.includes(p)&&v!==null&&!/^(<{7}|={7}|>{7})/m.test(v))S.merge.conflicts=S.merge.conflicts.filter(x=>x!==p)}
   if(!found.length)return error('pathspec did not match any files (sau sunt ignorate).');return ok('Staged: '+found.join(', ')+(S.merge&&!S.merge.conflicts.length?'\nAll conflicts fixed but you are still merging.':''),'stage');}
 case 'commit':{let i=rest.indexOf('-m');let msg=i>=0?rest[i+1]:null;if(!msg)return error('Specificați un mesaj: git commit -m "mesaj"');if(S.merge?.conflicts.length)return error('Unmerged paths: '+S.merge.conflicts.join(', '));if(!Object.keys(S.staged).length&&!S.merge)return error('nothing to commit, working tree clean');const newFiles=stageTree();const parents=S.merge?[head(),S.merge.target]:[head()];const id=makeCommit(msg,parents,newFiles);S.branches[S.current]=id;S.staged={};S.merge=null;return ok('['+S.current+' '+id+'] '+msg+'\nCommit created locally. ('+Object.keys(newFiles).length+' tracked files)','commit');}
 case 'log':return ok(gitLog(),'log');
 case 'branch':{if(!rest.length||rest[0]==='-a'){const all=Object.keys(S.branches).sort().map(x=>(x===S.current?'* ':'  ')+x);if(rest[0]==='-a')all.push(...Object.keys(S.remote).map(x=>'  remotes/origin/'+x));return info(all.join('\n'))}
   if(['-d','-D'].includes(rest[0])){const name=rest[1];if(!name||!own(S.branches,name))return error('Branch inexistent.');if(name===S.current)return error('Nu poți șterge branch-ul activ.');if(rest[0]==='-d'&&!isAncestor(S.branches[name],head()))return error('Branch-ul nu este integrat în branch-ul curent.');delete S.branches[name];return ok('Deleted branch '+name+'.')}
   const name=rest[0];if(!validateBranch(name))return error('Nume de branch invalid.');if(own(S.branches,name))return error('Branch-ul există deja.');S.branches[name]=head();return ok('Created branch '+name+'. (HEAD rămâne pe '+S.current+')');}
 case 'switch':case 'checkout':{let name=rest[0];let create=rest.includes('-c')||rest.includes('-b');if(create)name=rest[rest.indexOf(rest.includes('-c')?'-c':'-b')+1];if(!name)return error('Specifică un branch.');if(S.merge)return error('Încheie/abandonează merge-ul înainte de switch.');if(dirty())return error('Există modificări nesalvate. Fă commit sau restore înainte de switch.');if(create){if(!validateBranch(name)||own(S.branches,name))return error('Branch invalid sau deja existent.');S.branches[name]=head();}
   if(!own(S.branches,name))return error('Branch necunoscut: '+name);S.current=name;S.files=tree(head(name));S.staged={};return ok('Switched to branch '+name,(create?'switchNew':name==='main'?'switchMain':'switch'));}
 case 'remote':{if(rest[0]==='-v')return info('origin  https://github.com/student/git-lab.git (fetch)\norigin  https://github.com/student/git-lab.git (push)\n(URL FICTIV · numai în simulator)');if(rest[0]==='add'&&rest[1]==='origin')return info('origin este deja configurat în simulator.');return info('Remote: origin (simulat). git remote -v');}
 case 'push':{if(rest.includes('--delete')){const b=rest[rest.indexOf('--delete')+1];if(!b||b==='main'||!own(S.remote,b))return error('Branch remote inexistent sau protejat.');delete S.remote[b];delete S.tracking[b];return ok('Deleted origin/'+b,'pushDelete')}
   const branch=rest.find(x=>own(S.branches,x))||S.current;if(!own(S.branches,branch))return error('Branch local inexistent: '+branch);const local=S.branches[branch],rem=S.remote[branch];if(!local)return error('Nu există commit-uri de publicat.');if(rem&&!isAncestor(rem,local))return error('! [rejected] non-fast-forward. Remote a avansat; folosește git pull înainte de push.');S.remote[branch]=local;S.tracking[branch]=local;if(S.pr&&S.pr.branch===branch&&S.pr.status==='open'){S.review=false;S.ci='idle';}return ok('To github.com:student/git-lab.git [SIMULAT]\n   '+(rem||'0000000')+'..'+local+'  '+branch+' -> '+branch+'\n✓ Publicat pe origin/'+branch,'push');}
 case 'fetch':{S.tracking={...S.remote};return ok('From origin (simulat): refs actualizate; working tree neschimbat.','fetch')}
 case 'pull':{let b=rest.find(x=>own(S.remote,x))||S.current;if(!own(S.remote,b))return error('Nu există origin/'+b);if(dirty())return error('Ai modificări locale nesalvate. Fă commit sau restore înainte de pull.');S.tracking={...S.remote};const rem=S.remote[b];if(S.current!==b)return error('Schimbă pe '+b+' înainte să faci pull în acest scenariu.');if(rem===head())return ok('Already up to date.','pull');if(isAncestor(head(),rem)){const previous=head();S.branches[b]=rem;S.files=tree(rem);return ok('Updating '+(previous||'0000000')+'..'+rem+'\nFast-forward. Working tree actualizat.','pull')}
   const m=mergeCommit(rem,'origin/'+b);return m;}
 case 'merge':{if(rest[0]==='--abort'){if(!S.merge)return error('No merge to abort.');S.files=tree();S.staged={};S.merge=null;return ok('Merge aborted. Working tree restored.','abort')}
   const b=rest[0];if(!b||!own(S.branches,b))return error('Branch local necunoscut: '+(b||''));if(dirty())return error('Salvează sau elimină modificările din working tree înainte de merge.');return mergeCommit(S.branches[b],b);}
 case 'diff':{const cached=rest.includes('--cached')||rest.includes('--staged'),base=cached?tree():stageTree(),other=cached?stageTree():S.files;const paths=[...new Set([...Object.keys(base),...Object.keys(other)])].filter(k=>base[k]!==other[k]);if(!paths.length)return info('(no diff)');return info(paths.map(p=>'diff --git a/'+p+' b/'+p+'\n--- a/'+p+'\n+++ b/'+p+'\n-'+(base[p]??'<new file>').trim().slice(0,100)+'\n+'+(other[p]??'<deleted>').trim().slice(0,100)).join('\n'));}
 case 'restore':{const staged=rest.includes('--staged'),p=rest.at(-1);if(!p||p==='--staged')return error('Specifică fișierul.');if(staged){if(!own(S.staged,p))return error('Fișierul nu este în staging.');delete S.staged[p];return ok('Unstaged '+p)}if(!own(stageTree(),p))return error('Path untracked; nu îl pot restaura.');S.files[p]=stageTree()[p];return ok('Restored '+p+' in working tree.');}
 case 'config':return info('Autor de demo: Student USO <student@example.com>\nSimulatorul nu modifică git config real.');
 case 'show':{let c=S.commits[head()];return c?info(c.id+' '+c.msg+'\n'+Object.keys(c.files).join('\n')):error('No commits yet.');}
 default:return error('Comandă Git neimplementată în acest simulator: '+sub+'. Tastează help.');
 }
}
function mergeCommit(source,sourceName){if(!source)return error('Branch-ul de integrat nu are commit-uri.');let local=head();if(local===source||isAncestor(source,local))return ok('Already up to date.','merge');if(isAncestor(local,source)){S.branches[S.current]=source;S.files=tree(source);return ok('Updating '+(local||'0000000')+'..'+source+'\nFast-forward\n✓ '+sourceName+' integrat în '+S.current,'merge')}
 const r=combineTrees(local,source);S.files=r.out;S.staged={};S.merge={target:source,origin:sourceName,conflicts:r.conflicts};if(r.conflicts.length)return {txt:'CONFLICT (content): '+r.conflicts.join(', ')+'\nFix conflicts and then run git add + git commit. (sau git merge --abort)\nVezi markerii în editor.',kind:'error',event:'conflict'};
 for(const [k,v] of Object.entries(r.out))if(v!==tree()[k])S.staged[k]=v;
 const id=makeCommit('Merge '+sourceName+' into '+S.current,[local,source],r.out,'main');S.branches[S.current]=id;S.staged={};S.merge=null;return ok('Merge made by the simulator: '+id+' (2 parents)','merge');}
function runPR(action){if(action==='create'){if(S.pr?.status==='open')return error('Există deja un PR deschis.');if(S.current==='main')return error('Pentru PR lucrează pe un branch separat de main.');const feature=S.remote[S.current];if(!feature)return error('Publică întâi branch-ul: git push origin '+S.current);if(feature===S.remote.main||isAncestor(feature,S.remote.main))return error('Nicio schimbare nouă de integrat în main.');S.pr={branch:S.current,status:'open',title:'feat: '+S.current.replace(/[-/]/g,' '),base:'main'};S.review=false;S.ci='idle';return ok('Pull Request #1 OPEN (SIMULAT): '+S.current+' → main\nPoți solicita review și rula verificări.','prCreate');}
 if(!S.pr||S.pr.status!=='open')return error('Nu există un Pull Request deschis.');
 if(action==='approve'){S.review=true;return ok('✓ APPROVED · un colaborator a verificat modificările (simulat).','approve');}
 if(action==='merge'){if(!S.review)return error('DEMO POLICY: trebuie review/approve înainte de merge.');if(S.ci!=='passed')return error('DEMO POLICY: rulează cu succes verificările CI înainte de merge.');const source=S.remote[S.pr.branch],base=S.remote.main;
 const r=combineTrees(base,source);if(r.conflicts.length)return error('PR has conflicts in: '+r.conflicts.join(', ')+'. Rezolvă local înainte de merge.');
 const id=makeCommit('Merge pull request #1: '+S.pr.title,[base,source],r.out,'main');S.remote.main=id;S.pr.status='merged';return ok('✓ MERGED PR #1 into origin/main ('+id+')\nIMPORTANT: main local NU a fost actualizat. git switch main && git pull origin main','prMerge');}
 return error('Comandă pr invalidă. Folosește: pr create | pr approve | pr merge');}
function runCI(){if(S.ci==='running')return warn('Checks deja în execuție.');if(!S.pr||S.pr.status!=='open')return error('Deschide un Pull Request înainte de verificări.');S.ci='running';render();out('⚡ Simulating CI · README presence ...','info');const docs=tree(S.remote[S.pr.branch]);const passed=own(docs,'README.md')&&!Object.values(docs).some(v=>v.includes('FAIL_CI'));
 ciTimer=setTimeout(()=>{S.ci=passed?'passed':'failed';out(passed?'✓ 2/2 simulated checks passed.':'✖ Simulated checks failed. README.md missing sau marker FAIL_CI.',passed?'ok':'error');if(passed)event('ciPassed');else render();},720);return info('Checks pornite (SIMULARE, nu GitHub Actions).');}
function runEcho(cmd){let found=cmd.match(/^echo\s+([\s\S]*?)\s*(>>|>)\s*([^\s]+)\s*$/);if(!found)return error('Sintaxă: echo "text" > fișier   sau   echo "text" >> fișier');let content=found[1].trim();if((content.startsWith('"')&&content.endsWith('"'))||(content.startsWith("'")&&content.endsWith("'")))content=content.slice(1,-1);let name=found[3];if(name.includes('..')||name.startsWith('/'))return error('Folosește un nume simplu de fișier în simulator.');S.files[name]=found[2]==='>>'?(S.files[name]||'')+content+'\n':content+'\n';return ok((found[2]==='>>'?'Appended to ':'Wrote ')+name+' in working tree.','edit');}
function execute(cmd){const raw=cmd.trim();if(!raw)return;out(raw,'command');S.history.push(raw);S.histAt=S.history.length;$('commandInput').value='';$('terminalState').textContent='EXECUTED';let result;
 try{
  // An explicit, narrowly supported two-command convenience for the PR teaching script.
  if(raw==='git switch main && git pull origin main'){
    let a=runGit(['switch','main']);if(a.kind==='error')result=a;else{out(a.txt,a.kind);result=runGit(['pull','origin','main'])}
  }else if(raw==='clear'){$('terminalScreen').replaceChildren();result=null}
  else if(raw==='help'||raw==='?'||raw==='git help'){$('helpDialog').showModal();result=info('Ajutorul este deschis.');}
  else if(raw.startsWith('echo '))result=runEcho(raw);
  else if(raw==='ls'||raw==='ls -a')result=info((raw.includes('-a')?'.\n..\n.git\n':'')+Object.keys(S.files).sort().join('\n'));
  else if(raw.startsWith('cat ')){let path=raw.slice(4).trim();result=own(S.files,path)?info(S.files[path]):error('Fișierul nu există: '+path)}
  else if(raw.startsWith('git ')){const args=shellArgs(raw.slice(4));result=args?runGit(args):error('Ghilimele neînchise.');}
  else if(raw.startsWith('pr '))result=runPR(raw.slice(3).trim());
  else if(raw==='ci run')result=runCI();
  else if(raw==='resolve README.md')result=resolveConflict();
  else if(raw.startsWith('edit ')){let p=raw.slice(5).trim();if(!own(S.files,p))result=error('Fișier inexistent, creează-l cu echo sau butonul + FILE.');else{$('fileSelect').value=p;renderEditor();$('fileContent').focus();result=info('Editează conținutul și apasă SALVEAZĂ ÎN WORKING TREE.');}}
  else result=error('Nu este o comandă suportată. tastează help pentru lista comenzilor.');
 }catch(e){result=error('Simulator error: '+e.message);console.error(e)}
 if(result){out(result.txt,result.kind);if(result.event)event(result.event);else render()}
}
function resolveConflict(){if(!S.merge?.conflicts.includes('README.md'))return error('Nu există conflict activ în README.md.');const text=S.files['README.md'];if(!text.includes('<<<<<<< HEAD'))return error('Fișierul nu are markeri de conflict.');S.files['README.md']='# Sorting Algorithms\n\nAlgoritmi în C — cu explicații și exemple, de pe laptop și de la coleg.\n';return ok('Resolved README.md in working tree. Rulează git add README.md.','resolve')}
function setContent(name,value){if(!name){note('Selectează un fișier.');return}if(name.includes('..')||name.startsWith('/')){note('Nume invalid.');return}S.files[name]=value;const isResolution=S.merge?.conflicts.includes(name)&&!/(<{7}|={7}|>{7})/m.test(value);event(isResolution?'resolve':'edit');note('Fișier salvat în working tree: '+name);}
function renderEditor(force=false){const sel=$('fileSelect'),chosen=sel.value;const all=Object.keys(S.files).sort();sel.innerHTML=all.map(k=>'<option value="'+esc(k)+'">'+esc(k)+'</option>').join('');if(all.length){sel.value=all.includes(chosen)&&!force?chosen:all[0];$('fileContent').value=S.files[sel.value];$('fileContent').disabled=false;$('btnSaveFile').disabled=false}else{sel.innerHTML='<option value="">(niciun fișier)</option>';$('fileContent').value='';$('fileContent').disabled=true;$('btnSaveFile').disabled=true}}
function render(first=false){const d=differences();$('commitCount').textContent=Object.keys(S.commits).length;$('branchCount').textContent=Object.keys(S.branches).length;
 $('headBadge').textContent='HEAD → '+S.current+' '+(head()?'@ '+head():'(unborn)');$('workCount').textContent=d.work.length+d.untracked.length;$('stageCount').textContent=d.stage.length;$('localCount').textContent=Object.keys(S.commits).length;$('remoteCount').textContent=Object.values(S.remote).filter(Boolean).length;
 $('workFiles').innerHTML=[...d.work,...d.untracked].length?[...d.work,...d.untracked].map(x=>'<span class="file-pill">'+esc(x)+'</span>').join(''):'<span class="file-placeholder">clean / nimic modificat</span>';
 $('stageFiles').innerHTML=d.stage.length?d.stage.map(x=>'<span class="file-pill staged">'+esc(x)+'</span>').join(''):'<span class="file-placeholder">empty staging area</span>';
 $('localRef').textContent=S.current+' @ '+(head()||'(no commits)')+(S.merge?' · MERGING...':'');$('remoteRef').textContent=Object.entries(S.remote).map(([k,v])=>'origin/'+k+' @ '+(v||'(empty)')).join(' · ');
 if(first)renderEditor(true);else{const v=$('fileSelect').value;if(!$('fileContent').matches(':focus'))renderEditor(false);if(v&&own(S.files,v)&&!$('fileContent').matches(':focus')){$('fileSelect').value=v;$('fileContent').value=S.files[v]}}
 renderGraph();renderMission();renderPR();}
function renderMission(){const s=scenes[S.scene],list=s.missions,i=S.mission,m=list[i];$('missionSceneTitle').textContent=s.name;$('missionLevel').textContent=s.level;$('progressFill').style.width=(list.length?100*i/list.length:100)+'%';$('progressLabel').textContent=i+' / '+list.length+' PAȘI';$('missionPercent').textContent=Math.round((list.length?i/list.length:1)*100)+'%';$('score').textContent=S.score+' XP';
 if(!m){$('missionSymbol').textContent='✦';$('missionStepNum').textContent='MISSION COMPLETE';$('missionTitle').textContent='Univers stabilizat!';$('missionDescription').textContent='Ai terminat. Poți relua sau trece la scenariul următor.';$('missionCommand').textContent='git log --graph --all';$('missionHint').textContent='Git este mai ușor când urmărești starea după fiecare comandă.';$('missionMotivation').textContent='GG / LEVEL COMPLETE';$('btnRunSuggestion').disabled=true;$('btnMissionAction').hidden=true;return}
 $('missionSymbol').textContent=['⌁','⟡','⤷','⚡','◈','◆','◎','✦'][i%8];$('missionStepNum').textContent='OBIECTIV '+String(i+1).padStart(2,'0');$('missionTitle').textContent=m[0];$('missionDescription').textContent=m[1];$('missionCommand').textContent=m[2];$('missionHint').textContent=m[3];$('missionMotivation').textContent=s.intro;$('btnRunSuggestion').disabled=false;
 const act=$('btnMissionAction');const a=S.scene==='branch'&&i===1?'✦ CREEAZĂ .gitignore':S.scene==='conflict'&&i===1?'✦ REZOLVĂ AUTOMAT PENTRU DEMO':null;act.hidden=!a;if(a)act.textContent=a;
}
function refTags(id){const tags=[];for(const [name,v] of Object.entries(S.branches))if(v===id)tags.push({s:(name===S.current?'HEAD → ':'')+name,type:name==='main'?'main':'feature'});for(const [name,v] of Object.entries(S.remote))if(v===id)tags.push({s:'origin/'+name,type:'remote'});return tags}
function graphSvgNode(c,x,y){let lane=c.hint==='main'?0:c.hint==='origin/main'?2:1;const colors=['#67def2','#f88ed7','#a9ffb9'];const color=colors[lane];let tags=refTags(c.id),txt=c.msg.length>48?c.msg.slice(0,45)+'…':c.msg;
 let part=`<circle class="node" cx="${x}" cy="${y}" r="11" fill="#111b31" stroke="${color}"/><circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
 part+=`<text class="graph-hash" x="${x+24}" y="${y-3}">${esc(c.id)}</text><text class="graph-message" x="${x+86}" y="${y-3}">${esc(txt)}</text>`;
 let tx=x+24;for(const tag of tags){let w=Math.min(180,24+tag.s.length*7);part+=`<rect x="${tx}" y="${y+9}" width="${w}" height="20" rx="5" fill="${tag.type==='main'?'#75dff0':tag.type==='remote'?'#a8ffbf':'#fa90d1'}" opacity=".91"/><text class="graph-label" x="${tx+7}" y="${y+22}">${esc(tag.s)}</text>`;tx+=w+7;}
 return part;}
function renderGraph(){const commits=Object.values(S.commits).sort((a,b)=>b.index-a.index).slice(0,28),svg=$('graph');const N=commits.length;if(!N){$('graphEmpty').hidden=false;svg.innerHTML='';return}$('graphEmpty').hidden=true;
 const H=Math.max(326,N*67+42);svg.setAttribute('viewBox',`0 0 900 ${H}`);svg.setAttribute('height',H);svg.style.height=H+'px';
 const coords={},lane=x=>x.hint==='main'?76:x.hint==='origin/main'?274:166;
 for(let i=0;i<N;i++)coords[commits[i].id]={x:lane(commits[i]),y:56+i*67};let lines='',nodes='';
 for(const c of commits){let p=coords[c.id];for(const id of c.parents){if(!coords[id])continue;const t=coords[id];lines+=`<path class="edge" d="M${p.x} ${p.y+10} C${p.x} ${p.y+40} ${t.x} ${t.y-38} ${t.x} ${t.y-10}" stroke="${c.hint==='origin/main'?'#a8ffbf':c.hint==='main'?'#62dcf4':'#fa90d1'}"/>`}}
 for(const c of commits){const p=coords[c.id];nodes+=graphSvgNode(c,p.x,p.y)}
 svg.innerHTML=`<g class="graph-edges">${lines}</g><g class="graph-nodes">${nodes}</g>`;
}
function renderPR(){const pr=S.pr;const tag=$('prStatus');tag.className='status-tag '+(!pr?'neutral':pr.status==='open'?'open':'closed');tag.textContent=!pr?'NO PULL REQUEST':pr.status==='open'?'● PR #1 OPEN':'✓ PR #1 MERGED';$('prTitle').textContent=!pr?'Ready for collaboration?':pr.title+' → main';$('prMessage').textContent=!pr?'Un branch publicat pe GitHub poate deveni Pull Request, cu review și merge.':pr.status==='merged'?'Merge efectuat pe GitHub simulat. Sincronizează main local cu git pull.':('Review: '+(S.review?'APPROVED':'WAITING')+' · CI: '+S.ci.toUpperCase()+' · target: origin/main');
 $('btnCreatePR').disabled=!!pr&&pr.status==='open';$('btnApprovePR').disabled=!pr||pr.status!=='open'||S.review;$('btnMergePR').disabled=!pr||pr.status!=='open'||!S.review||S.ci!=='passed';$('btnCI').disabled=!pr||pr.status!=='open'||S.ci==='running';
 const checks=$('ciChecks');const props=S.ci==='passed'?['pass','PASS']:S.ci==='failed'?['fail','FAIL']:S.ci==='running'?['','RUNNING']:['','NOT RUN'];checks.innerHTML=['README presence','Basic content check'].map((x,i)=>'<div><span class="check-icon '+props[0]+'">'+(S.ci==='passed'?'✓':S.ci==='failed'?'✗':S.ci==='running'?'◌':'○')+'</span><span>'+x+'</span><small>'+props[1]+'</small></div>').join('');}
function openQuiz(){quizIndex=0;quizPoints=0;quizAnswered=false;showQuiz();$('quizDialog').showModal()}
function showQuiz(){if(quizIndex>=quiz.length){$('quizProgress').textContent='MISSION COMPLETE · SCORE '+quizPoints+'/'+quiz.length;$('quizQuestion').textContent=quizPoints===5?'PERFECT RUN! ⚡':'Ai obținut '+quizPoints+' din '+quiz.length+' puncte.';$('quizAnswers').innerHTML='<div class="quiz-feedback">'+(quizPoints>=4?'Excelent. Ai înțeles conceptele-cheie.':'Poți relua quiz-ul oricând — ideea este să înțelegi, nu să memorezi.')+'</div>';$('quizFeedback').textContent='';$('quizNext').textContent='RESTART ↻';$('quizNext').disabled=false;return}const q=quiz[quizIndex];$('quizProgress').textContent='QUESTION '+String(quizIndex+1).padStart(2,'0')+' / '+String(quiz.length).padStart(2,'0');$('quizQuestion').textContent=q.q;$('quizAnswers').replaceChildren();q.a.forEach((a,i)=>{const b=document.createElement('button');b.textContent=String.fromCharCode(65+i)+'. '+a;b.addEventListener('click',()=>answerQuiz(i));$('quizAnswers').append(b)});$('quizFeedback').textContent='';$('quizNext').textContent='URMĂTOAREA →';$('quizNext').disabled=true;quizAnswered=false;}
function answerQuiz(index){if(quizAnswered)return;quizAnswered=true;const q=quiz[quizIndex];$('quizAnswers').querySelectorAll('button').forEach((b,i)=>{b.disabled=true;if(i===q.correct)b.classList.add('right');else if(i===index)b.classList.add('wrong')});if(index===q.correct){quizPoints++;$('quizFeedback').textContent='✓ Corect! '+q.why}else $('quizFeedback').textContent='✕ Nu chiar. '+q.why;$('quizNext').disabled=false;}
function start(){
 $('helpGrid').innerHTML=help.map(([a,b])=>'<article><code>'+esc(a)+'</code><span>'+esc(b)+'</span></article>').join('');
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
 $('quizDialog').addEventListener('close',()=>document.querySelectorAll('.scene').forEach(x=>x.classList.toggle('active',x.dataset.scenario===S.scene)));
 document.querySelectorAll('.scene').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.scenario==='quiz'){document.querySelectorAll('.scene').forEach(x=>x.classList.toggle('active',x===b));openQuiz();return}reset(b.dataset.scenario)}));
 $('btnHelp').addEventListener('click',()=>$('helpDialog').showModal());$('btnReset').addEventListener('click',()=>reset(S.scene==='quiz'?'start':S.scene));
 $('btnFullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>note('Fullscreen nu este permis de browser.'))});
 $('btnShowLog').addEventListener('click',()=>execute('git log --oneline --graph --all'));
 $('btnClear').addEventListener('click',()=>{$('terminalScreen').replaceChildren();out('Terminal cleared. Repository unchanged.','muted')});
 $('terminalForm').addEventListener('submit',e=>{e.preventDefault();execute($('commandInput').value)});
 $('commandInput').addEventListener('keydown',e=>{if(e.key==='ArrowUp'){e.preventDefault();if(S.histAt>0)S.histAt--;e.target.value=S.history[S.histAt]||''}if(e.key==='ArrowDown'){e.preventDefault();if(S.histAt<S.history.length)S.histAt++;e.target.value=S.history[S.histAt]||''}});
 document.addEventListener('keydown',e=>{
 if(e.altKey&&['1','2','3','4','5'].includes(e.key)&&!document.querySelector('dialog[open]')){e.preventDefault();const name=['start','branch','pr','conflict','quiz'][Number(e.key)-1];if(name==='quiz')openQuiz();else reset(name);return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('commandInput').focus();return}
 if(e.key==='?'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('helpDialog').open&&!$('quizDialog').open){e.preventDefault();$('helpDialog').showModal()}if(e.key==='Escape')document.querySelectorAll('dialog[open]').forEach(x=>x.close())});
 $('btnUseCommand').addEventListener('click',()=>{$('commandInput').value=$('missionCommand').textContent;$('commandInput').focus()});
 $('btnRunSuggestion').addEventListener('click',()=>execute($('missionCommand').textContent));
 $('btnMissionAction').addEventListener('click',()=>{if(S.scene==='branch'&&S.mission===1)execute('echo "*.o" > .gitignore');if(S.scene==='conflict'&&S.mission===1)execute('resolve README.md')});
 $('btnNewFile').addEventListener('click',()=>{let n=prompt('Nume fișier nou (ex.: notes.md, main.c):');if(n===null)return;n=n.trim();if(!n||!/^[\w./-]+$/.test(n)||n.includes('..')||n.startsWith('/')){note('Nume invalid.');return}if(own(S.files,n)){note('Fișierul există deja.');return}S.files[n]='';event('edit');$('fileSelect').value=n;$('fileContent').value='';$('fileContent').focus()});
 $('fileSelect').addEventListener('change',()=>{$('fileContent').value=S.files[$('fileSelect').value]||''});
 $('btnSaveFile').addEventListener('click',()=>setContent($('fileSelect').value,$('fileContent').value));
 $('btnCreatePR').addEventListener('click',()=>execute('pr create'));
 $('btnApprovePR').addEventListener('click',()=>execute('pr approve'));
 $('btnMergePR').addEventListener('click',()=>execute('pr merge'));
 $('btnCI').addEventListener('click',()=>execute('ci run'));
 $('quizNext').addEventListener('click',()=>{if(quizIndex>=quiz.length){quizIndex=0;quizPoints=0}else quizIndex++;showQuiz()});
 reset('start');
}
start();
window.GitLab={execute,reset,getState:()=>clone(S)}; // Exposed only for console-based educational tests.
})();
