(()=>{'use strict';
const $=id=>document.getElementById(id),api=async(path,data)=>{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let j;try{j=await r.json()}catch{throw Error('Server indisponibil.')}if(!r.ok)throw Error(j.error||'Eroare');return j};
let me=null,lastKey='',submitting=false;
const params=new URLSearchParams(location.search);if(params.has('pin'))$('joinPin').value=params.get('pin').slice(0,6);
function el(tag,cls,text){let n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function view(){ $('joinBox').hidden=!!me;$('playBox').hidden=!me;if(me)$('playerName').textContent=me.name }
async function join(e){e.preventDefault();const b=$('joinForm').querySelector('button');b.disabled=true;$('joinError').textContent='';try{me=await api('join',{pin:$('joinPin').value.trim(),name:$('nickname').value.trim()});sessionStorage.setItem('gitlab-arena-player',JSON.stringify(me));view();await poll()}catch(e){$('joinError').textContent=e.message}finally{b.disabled=false}}
function update(s){
 const phase=s.phase,q=s.question,changed=lastKey!==phase+'-'+s.index;
 $('myScore').textContent=s.me.points;
 $('myRound').textContent=q?.round||'LOBBY';$('myQuestionNumber').textContent=s.index<0?'READY':(s.index+1)+' / '+s.total;
 $('myClock').textContent=s.phase==='question'?Math.ceil(s.remaining):'—';
 $('myClockFill').style.width=s.phase==='question'?(100*s.remaining/(s.question?.seconds||25))+'%':'0%';
 $('waiting').hidden=phase!=='lobby';$('playing').hidden=phase!=='question';$('playerReveal').hidden=phase!=='reveal';$('playerFinished').hidden=phase!=='finished';
 if(phase==='question'&&q){
  if(changed){$('myQuestion').textContent=q.question;const div=$('myAnswers');div.replaceChildren(...q.options.map((v,i)=>{let b=el('button','',String.fromCharCode(65+i)+' / '+v);b.type='button';b.addEventListener('click',()=>answer(i,s.index));return b}))}
  [...$('myAnswers').children].forEach((b,i)=>{const answered=s.me.choice!==null;b.disabled=answered||submitting;b.classList.toggle('selected',answered&&s.me.choice===i)});
  $('answerHint').textContent=s.me.choice===null?'Tap rapid pe varianta corectă!':'Răspuns trimis ✓ Așteaptă rezultatul...';
 }
 if(phase==='reveal'&&q){$('myResultIcon').textContent=s.me.choice===null?'⌛':s.me.isCorrect?'✓':'×';$('myResultIcon').style.color=s.me.isCorrect?'#b3facd':'#ff9ab3';$('myResult').textContent=s.me.choice===null?'Timpul a expirat!':s.me.isCorrect?'CORECT! LET’S GO!':'Nu de data asta!';$('myExplanation').textContent='Răspuns corect: '+String.fromCharCode(65+q.correct)+' / '+q.options[q.correct]+' · '+q.explain;$('myEarned').textContent='+'+(s.me.earned||0)+' XP'}
 if(phase==='finished')$('finalScore').textContent='Scor final: '+s.me.points+' XP · '+s.me.correct+' răspunsuri corecte.';
 lastKey=phase+'-'+s.index;
}
async function answer(choice,index){if(submitting||!me)return;submitting=true;try{await api('answer',{pin:me.pin,id:me.id,token:me.token,index,choice});await poll()}catch(e){$('answerHint').textContent=e.message}finally{submitting=false}}
async function poll(){if(!me)return;try{const s=await api('state',{role:'player',pin:me.pin,id:me.id,token:me.token});update(s)}catch(e){if(/invalid|inexistent/.test(e.message)){sessionStorage.removeItem('gitlab-arena-player');me=null;view();$('joinError').textContent='Sesiunea a expirat. Intră din nou.'}}}
$('joinForm').addEventListener('submit',join);
try{const old=JSON.parse(sessionStorage.getItem('gitlab-arena-player')||'null');if(old?.id&&old?.token){me=old;view();poll()}}catch{}
setInterval(()=>{if(me&&document.visibilityState!=='hidden')poll()},850);
})();
