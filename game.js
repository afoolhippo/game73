'use strict';
(()=>{
const $=id=>document.getElementById(id), screens=['titleScreen','gameScreen','resultScreen'];
const GAME_ID='game73', GAME_TITLE='ジンライムください！';
const GAME_URL='https://afoolhippo.github.io/game73/';
const ARCADE_URL='https://afoolhippo.github.io/home/?skipTitle=1';
const SUPABASE_URL='https://gmncxnybsovlallxgnkd.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_ly3h5OhL8HDSHhYdmJq_Fw_9pG3mhla';
let resultTimer=null, resultSession=0, resultSnapshot=null, scoreRegistered=false, registering=false;
const resultButtons=$('resultButtons'), registerButton=$('registerButton');
function hideResultButtons(){clearTimeout(resultTimer);resultTimer=null;resultButtons.classList.add('hidden');resultButtons.inert=true;resultButtons.querySelectorAll('button').forEach(b=>b.disabled=true)}
function resetResult(){resultSession++;hideResultButtons();resultSnapshot=null;scoreRegistered=false;registering=false;registerButton.textContent='記録を登録'}
function showResultButtonsLater(){hideResultButtons();const session=resultSession;resultTimer=setTimeout(()=>{if(state!=='result'||session!==resultSession)return;resultButtons.classList.remove('hidden');resultButtons.inert=false;resultButtons.querySelectorAll('button').forEach(b=>b.disabled=false)},1500)}
function shareResult(){if(state!=='result'||!resultSnapshot||resultButtons.inert)return;const text=`🍸「${GAME_TITLE}」で${resultSnapshot.score}点！\n称号：${resultSnapshot.rank}\n\n🍋あなたは何点つくれる？\n${GAME_URL}\n\n#カバゲーセン #ジンライムください`;window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text),'_blank','noopener,noreferrer')}
async function registerResult(){
 if(state!=='result'||!resultSnapshot||resultButtons.inert||scoreRegistered||registering)return;
 const input=prompt('ニックネームを入力してね','匿名カバ');if(input===null)return;const nickname=input.trim();if(!nickname)return;
 const session=resultSession,snapshot={...resultSnapshot};registering=true;registerButton.disabled=true;registerButton.textContent='登録中…';
 try{
  if(!window.supabase)throw new Error('記録登録の読み込みに失敗しました');
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {error}=await db.from('kaba_scores').insert({game_id:GAME_ID,game_title:GAME_TITLE,nickname,rank_title:snapshot.rank,score:snapshot.score});
  if(error)throw error;
  if(session!==resultSession||state!=='result')return;
  scoreRegistered=true;registerButton.textContent='登録済み';alert('記録を登録しました！');
 }catch(error){console.error(error);if(session!==resultSession||state!=='result')return;registerButton.disabled=false;registerButton.textContent='記録を登録';alert('登録に失敗しました。もう一度お試しください。')}
 finally{if(session===resultSession)registering=false}
}
const blue='#0082cf', cream='#fffdee', green='#328957', lime='#b7d958';
const ctx=$('gameCanvas').getContext('2d'), rc=$('resultCanvas').getContext('2d');
let fx=null,particles=[];
let state='title',stage=0,amount=0,gin=0,quality=0,score=0,cups=0,combo=0,maxCombo=0,holding=false,pointer=null,holdTime=0,end=0,last=0,delayUntil=0,ginTarget=0,limeTarget=0;
// Fixed repeating order sequence keeps score attempts comparable.
const orders=[[60,25],[40,35],[75,15],[60,35],[75,25],[40,15],[75,35],[40,25]];
function ginLabel(t){return t===40?'少なめ':t===60?'普通':'多め'}
function limeLabel(t){return t===15?'少なめ':t===25?'普通':'多め'}
const sounds={complete:new Audio('se_complete.mp3'),perfect:new Audio('se_perfect.mp3'),combo:new Audio('se_combo.mp3')};
Object.values(sounds).forEach(a=>{a.volume=.65});
function sound(key){try{const a=sounds[key];a.currentTime=0;a.play().catch(()=>{})}catch(e){}}
function stopSounds(){Object.values(sounds).forEach(a=>{a.pause()})}
function burst(points,perfect){fx={at:performance.now(),points,perfect,combo};particles=[];const n=12+Math.min(combo,10)*3;for(let i=0;i<n;i++){const angle=Math.random()*Math.PI*2,speed=35+Math.random()*95;particles.push({x:122,y:144,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-35,color:i%2?blue:lime})}sound(perfect?'perfect':'complete');if([3,5,10].includes(combo))sound('combo')}
const bgm=new Audio('bgm.mp3');bgm.loop=true;bgm.volume=.5;
function show(id){screens.forEach(s=>$(s).hidden=s!==id)}
function stopHold(){holding=false;pointer=null;holdTime=0}
function title(){resetResult();state='title';stopHold();bgm.pause();stopSounds();show('titleScreen')}
function order(){[ginTarget,limeTarget]=orders[cups%orders.length];stage=0;amount=0;gin=0;quality=0;delayUntil=0;$('orderText').textContent=`ジン：${ginLabel(ginTarget)} ／ ライム：${limeLabel(limeTarget)}`;ui();$('feedback').textContent='' }
function start(){resetResult();stopHold();state='play';fx=null;particles=[];score=cups=combo=maxCombo=0;end=performance.now()+30000;show('gameScreen');$('score').textContent='0';$('time').textContent='30';order();try{bgm.currentTime=0;bgm.play().catch(()=>{})}catch(e){}}
function target(){return stage===0?ginTarget:limeTarget}
function ui(){$('pour').textContent=stage===0?'長押しでジンを注ぐ':'長押しでライムを搾る';$('pour').disabled=stage===2;$('pour').classList.toggle('limeButton',stage===1)}
function accuracy(a,t){return Math.max(0,100-Math.abs(a-t)*5)}
function release(){if(!holding||state!=='play')return;stopHold();if(performance.now()>=end){finish();return}const q=accuracy(amount,target());if(stage===0){gin=amount;quality=q;stage=1;amount=0;ui();$('feedback').textContent='' }else if(stage===1){const perfect=quality>=90&&q>=90,success=quality>=70&&q>=70;combo=success?combo+1:0;maxCombo=Math.max(maxCombo,combo);const multiplier=1+Math.min(Math.max(combo-1,0),10)*.1;const points=Math.round((quality+q+(perfect?50:0))*multiplier);score+=points;cups++;stage=2;delayUntil=performance.now()+450;burst(points,perfect);$('feedback').textContent='';$('score').textContent=score;$('pour').disabled=true;$('pour').textContent='提供中…'}}
function finish(){if(state!=='play')return;resetResult();state='result';stopHold();bgm.pause();show('resultScreen');$('finalScore').textContent=score;$('stars').textContent=score>=1800?'★★★':score>=1000?'★★☆':'★☆☆';$('rank').textContent=score>=1800?'伝説のジンライムマスター':score>=1000?'街のジンライム職人':'見習いバーテンダー';resultSnapshot={score,rank:$('rank').textContent};drawResult();showResultButtonsLater()}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function glass(c,x,y,w,h,level,drink='#a9dcec',juice=0,garnish=false){rect(c,x,y,w,h,blue);rect(c,x+3,y+3,w-6,h-6,cream);const lh=Math.round((h-9)*Math.min(level,100)/100);rect(c,x+4,y+h-4-lh,w-8,lh,drink);if(juice>0){const top=y+h-4-lh,depth=Math.max(1,Math.round(lh*Math.min(juice/100,.8)));rect(c,x+4,top,w-8,depth,'#bddf86');for(let i=0;i<4;i++){const d=Math.round(depth*(.3+(i%3)*.2));rect(c,x+8+i*11,top+depth,5,d,'#bddf86')}}for(let i=0;i<3;i++){const ix=x+10+i*12,iy=y+h-17-i*15;rect(c,ix,iy,12,12,'#d7ede2');rect(c,ix+3,iy+3,6,6,cream)}rect(c,x+7,y+7,3,h-16,'#c2e9f1');if(garnish)drawLime(c,x+w-3,y+1,15,false)}
function drawLime(c,x,y,r,squeezed){
c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,squeezed?.72:1);c.fillStyle=green;c.beginPath();c.arc(0,0,r,0,Math.PI);c.closePath();c.fill();c.fillStyle=lime;c.beginPath();c.arc(0,1,r-3,0,Math.PI);c.closePath();c.fill();c.strokeStyle=cream;c.lineWidth=2;for(const a of [.3,.75,1.2,1.65,2.1,2.6]){c.beginPath();c.moveTo(0,2);c.lineTo(Math.cos(a)*(r-5),Math.sin(a)*(r-5));c.stroke()}c.restore()}
// Pixel art is drawn on a small logical canvas, then enlarged without smoothing.
function draw(){ctx.clearRect(0,0,240,250);rect(ctx,0,0,240,250,cream);rect(ctx,0,224,240,3,blue);
ctx.save();if(fx&&fx.perfect&&performance.now()-fx.at<180){ctx.translate(Math.round(Math.sin(performance.now()*.12)*2),0)}
const visible=stage===0?amount:gin+amount*.45;glass(ctx,91,98,62,120,Math.min(visible,95),'#a9dcec',stage===0?0:amount,false);
const line=stage===0?ginTarget:Math.min(gin+limeTarget*.45,95),yy=214-111*line/100,col=stage===0?blue:green;for(let x=78;x<170;x+=9)rect(ctx,x,yy,5,2,col);rect(ctx,171,yy-3,7,8,col);
ctx.save();ctx.translate(113,45);if(stage===0){ctx.rotate(holding?-.65:0);rect(ctx,-18,-26,36,50,blue);rect(ctx,-14,-22,28,42,cream);rect(ctx,-8,24,16,17,blue);rect(ctx,-11,-7,22,16,'#a9dcec')}else{drawLime(ctx,0,0,29,holding)}ctx.restore();if(holding){for(let i=0;i<5;i++)rect(ctx,119,76+i*5+Math.floor(performance.now()/65)%5,3,3,stage===0?'#65bbdb':green)}ctx.restore();
if(fx){const age=(performance.now()-fx.at)/1000;if(age<.65){ctx.save();ctx.globalAlpha=Math.min(1,(.65-age)*4);for(const p of particles)rect(ctx,p.x+p.vx*age,p.y+p.vy*age+80*age*age,3,3,p.color);const scale=1+Math.max(0,1-age/.14)*.35;ctx.translate(120,135-age*25);ctx.scale(scale,scale);ctx.textAlign='center';ctx.font='bold 25px DotGothic16, monospace';ctx.lineWidth=5;ctx.strokeStyle=cream;ctx.strokeText('+'+fx.points,0,0);ctx.fillStyle=blue;ctx.fillText('+'+fx.points,0,0);ctx.font='bold 15px DotGothic16, monospace';ctx.strokeText(fx.perfect?'PERFECT!':'できあがり！',0,-28);ctx.fillStyle=green;ctx.fillText(fx.perfect?'PERFECT!':'できあがり！',0,-28);if(fx.combo>0){ctx.strokeText(fx.combo+' COMBO!',0,25);ctx.fillText(fx.combo+' COMBO!',0,25)}ctx.restore()}else fx=null}
}
function drawResult(){rect(rc,0,0,240,145,cream);rect(rc,30,133,180,3,blue);glass(rc,88,20,64,110,72,'#a9dcec',30,true)}
$('start').onclick=start;$('retry').onclick=title;$('back').onclick=title;$('shareButton').onclick=shareResult;registerButton.onclick=registerResult;$('arcadeButton').onclick=()=>{location.href=ARCADE_URL};
$('pour').addEventListener('pointerdown',e=>{if(state!=='play'||stage>1||holding)return;e.preventDefault();holding=true;pointer=e.pointerId;holdTime=0;$('pour').setPointerCapture(e.pointerId)});
$('pour').addEventListener('pointerup',e=>{if(e.pointerId===pointer)release()});$('pour').addEventListener('pointercancel',()=>stopHold());$('pour').addEventListener('lostpointercapture',()=>{if(holding)stopHold()});$('pour').addEventListener('contextmenu',e=>e.preventDefault());
$('pour').addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat&&state==='play'&&stage<2){e.preventDefault();holding=true;holdTime=0}});$('pour').addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();release()}});
window.addEventListener('blur',stopHold);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHold()});
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(state==='play'){if(now>=end){finish()}else{if(stage===2&&now>=delayUntil)order();if(holding&&stage<2){holdTime+=dt;amount=Math.min(100,amount+(stage===0?23:18)*(1+Math.min(holdTime,2)*.65)*dt);ui();if(amount>=100)release()}$('time').textContent=Math.ceil((end-now)/1000);draw()}}requestAnimationFrame(frame)}
title();requestAnimationFrame(frame);
})();
