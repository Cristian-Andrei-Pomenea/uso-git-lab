(()=>{'use strict';
const $=id=>document.getElementById(id),api=async(path,data)=>{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let j;try{j=await r.json()}catch{throw Error('Serverul nu răspunde. Verifică terminalul.')}if(!r.ok)throw Error(j.error||'Eroare de comunicare');return j};
let session=null,lastPhase='',lastIndex=-1,manual=false;
function notice(x){$('toast').textContent=x;$('toast').hidden=false;clearTimeout(notice.t);notice.t=setTimeout(()=>$('toast').hidden=true,3800)}
function setText(id,v){$(id).textContent=String(v)}
function el(tag,cls,text){let n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function phaseLabel(phase){return ({lobby:'LOBBY / WAITING',question:'LIVE / ANSWER NOW',reveal:'REVEAL / SCOREBOARD',finished:'GAME FINISHED'})[phase]||phase}
function renderRanks(rows){const podium=$('podium'),list=$('ranks');podium.replaceChildren();list.replaceChildren();rows.slice(0,3).forEach((p,i)=>{let n=el('div');n.append(el('span','',(['🥇','🥈','🥉'][i])),el('strong','',p.name),el('small','',p.points+' XP'));podium.append(n)});if(!rows.length)list.append(el('p','empty','Clasamentul apare când studenții răspund.'));rows.slice(3).forEach((p,i)=>{const d=el('div');d.append(el('span','',i+4+'.'),el('strong','',p.name),el('span','',p.points+' XP'));list.append(d)})}
function update(s){
  setText('playerCount',s.players);setText('pin',s.pin);setText('sessionPhase',phaseLabel(s.phase));$('round').textContent=s.question?.round||'LOBBY';
  const q=s.question,changed=s.phase!==lastPhase||s.index!==lastIndex;
  $('lobby').hidden=s.phase!=='lobby';$('questionStage').hidden=!['question','reveal'].includes(s.phase);$('finished').hidden=s.phase!=='finished';
  if(s.phase==='lobby'){$('names').replaceChildren(...s.names.map(n=>el('span','',n)))}
  if(q&&['question','reveal'].includes(s.phase)){
    if(changed){setText('topic',q.topic);setText('questionNumber',(s.index+1).toString().padStart(2,'0')+' / '+s.total);setText('questionText',q.question);
      $('hostAnswers').replaceChildren(...q.options.map((opt,i)=>{let d=el('div');d.append(el('strong','',String.fromCharCode(65+i)+' / '),document.createTextNode(opt),el('span','answer-stat','0 VOTES'));return d}));}
    const reveal=s.phase==='reveal';
    [...$('hostAnswers').children].forEach((node,i)=>{node.classList.toggle('correct',reveal&&q.correct===i);node.classList.toggle('wrong',reveal&&q.correct!==i);node.querySelector('.answer-stat').textContent=(s.distribution?.[i]||0)+' VOTES'});
    setText('clock',reveal?'00':Math.ceil(s.remaining).toString().padStart(2,'0'));
    $('clockFill').style.width=(reveal?0:100*s.remaining/Math.max(1,s.question.seconds||25))+'%';
    setText('answered',s.answered+' / '+s.players+' ANSWERED');$('explanation').hidden=!reveal;if(reveal)setText('explanation','✓ '+q.explain);
  }
  $('btnNext').hidden=s.phase==='question'||s.phase==='finished';$('btnNext').innerHTML=s.phase==='lobby'?'▶ START THE GAME <span>→</span>':s.index+1===s.total?'★ FINISH & PODIUM <span>→</span>':'▶ NEXT QUESTION <span>→</span>';
  $('btnReveal').hidden=s.phase!=='question';$('btnFinish').hidden=s.phase==='lobby'||s.phase==='finished';
  if(s.phase==='lobby') renderRanks([]); else renderRanks(s.leaderboard);
  if(changed&&s.phase==='reveal')fireConfetti();
  lastPhase=s.phase;lastIndex=s.index;
}
function fireConfetti(){for(let i=0;i<14;i++){let s=el('i');s.style.cssText='position:fixed;left:'+Math.random()*100+'vw;top:-20px;width:7px;height:13px;background:'+(['#77edfa','#fb91e4','#baffce','#d0b1ff'][i%4])+';z-index:300;pointer-events:none;transform:rotate('+Math.random()*180+'deg);transition:top 1.6s ease-in,left 1.6s ease-in,opacity 1.6s';document.body.append(s);requestAnimationFrame(()=>{s.style.top='105vh';s.style.left=(parseFloat(s.style.left)+Math.random()*25-12)+'vw';s.style.opacity='0'});setTimeout(()=>s.remove(),1800)}}
function showSession(){
 $('setup').hidden=true;$('dashboard').hidden=false;setText('pin',session.pin);
 $('qr').src='/api/qr?pin='+encodeURIComponent(session.pin);
 const origin=window.location.origin,urlOrigin=(window.location.hostname==='127.0.0.1'||window.location.hostname==='localhost')?null:origin;
 // The QR uses server's LAN URL; the share link is provided by the server on create.
 const share=session.join_url||((urlOrigin||origin)+'/join?pin='+session.pin);
 setText('joinUrl',share);
}
async function create(){try{const r=await api('create',{count:+$('questionCount').value,duration:+$('questionTime').value,admin_key:$('adminKey').value});session=r;session.join_url=r.join_url;$('adminKey').value='';localStorage.setItem('gitlab-arena-host',JSON.stringify(session));showSession();await poll()}catch(e){notice(e.message)}}
async function action(a){if(!session||manual)return;manual=true;try{await api('action',{pin:session.pin,token:session.token,action:a});await poll()}catch(e){notice(e.message)}finally{manual=false}}
async function poll(){if(!session)return;try{const s=await api('state',{role:'host',pin:session.pin,token:session.token});update(s)}catch(e){if(/invalidă|inexistent|PIN/.test(e.message)){session=null;localStorage.removeItem('gitlab-arena-host');$('dashboard').hidden=true;$('setup').hidden=false}notice(e.message)}}
$('btnCreate').addEventListener('click',create);
$('btnNext').addEventListener('click',()=>action('next'));
$('btnReveal').addEventListener('click',()=>action('reveal'));
$('btnFinish').addEventListener('click',()=>{if(confirm('Închei jocul acum?'))action('finish')});
$('btnCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('joinUrl').textContent);notice('Link copiat în clipboard!')}catch{notice('Selectează manual linkul afișat.')}});
$('btnFullscreen').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
try{const old=JSON.parse(localStorage.getItem('gitlab-arena-host')||'null');if(old?.pin&&old?.token){session=old;showSession();poll()}}catch{}
setInterval(()=>{if(session&&document.visibilityState!=='hidden')poll()},820);
})();
