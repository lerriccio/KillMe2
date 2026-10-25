'use strict';
(() => {
const elementCache=new Map();
const $ = id => elementCache.get(id)||cacheElement(id);
function cacheElement(id){const el=document.getElementById(id);if(el)elementCache.set(id,el);return el;}
const touchDevice=!!window.matchMedia?.('(pointer:coarse)').matches;
const preferences={musicVolume:70,sfxVolume:80,quality:touchDevice?'low':'high',shake:true,scanlines:false,audio:true};
try{const saved=JSON.parse(localStorage.getItem('killme2-settings-v1'));if(saved){for(const key of ['musicVolume','sfxVolume'])if(Number.isFinite(saved[key]))preferences[key]=Math.max(0,Math.min(100,saved[key]));for(const key of ['shake','scanlines','audio'])if(typeof saved[key]==='boolean')preferences[key]=saved[key];if(['high','low'].includes(saved.quality))preferences.quality=saved.quality;}}catch{}
function savePreferences(){try{localStorage.setItem('killme2-settings-v1',JSON.stringify(preferences));}catch{}}
const canvas = $('game');
// Render at display resolution; sprite source pixels remain deliberately crisp.
const textCanvas = $('gameText'), textCtx = textCanvas.getContext('2d');
let ctx = canvas.getContext('2d');
const TAU = Math.PI * 2, clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random() * (b-a);
const palettes = [
  {name:'CANYON DEI PREDONI',accent:'#ffcd65',enemy:'#ff675d',bg:'#51275a',grid:'#a55368'},
  {name:'BOSCO DEI FUNGHI',accent:'#66ffcf',enemy:'#f16cce',bg:'#123e49',grid:'#246b70'},
  {name:'FORGIA ABBANDONATA',accent:'#ffad43',enemy:'#ff586e',bg:'#252e58',grid:'#455580'}
];

const heroes=[
 {id:'gunslinger',name:'AXIOM',role:'Androide da duello',weapon:'Railgun Gemini',detail:'Due fucili elettromagnetici lunghi quanto il corpo. Scariche perforanti; la super libera 32 lance di plasma.',color:'#72e3ed',coat:'#304958',hp:100,speed:265,damage:26,rate:.29,shots:2,pierce:2,super:'COLLASSO DI PLASMA'},
 {id:'knight',name:'VULKOR',role:'Drago corazzato',weapon:'Ascia Sismica',detail:'Una doppia lama titanica. Ogni fendente frantuma e respinge i nemici; la super scatena un terremoto.',color:'#ff9760',coat:'#783d39',hp:175,speed:205,damage:65,rate:.72,shots:1,pierce:0,super:'FRACTURA TECTONICA'},
 {id:'bomber',name:'BASTION',role:'Mech cingolato',weapon:'Obice Apocalisse',detail:'Obice pesante a razzi esplosivi. La super scarica dodici missili in tutte le direzioni.',color:'#f5d56e',coat:'#52626a',hp:140,speed:215,damage:44,rate:.65,shots:1,pierce:0,super:'PROTOCOLLO APOCALISSE'},
 {id:'ranger',name:'NYX',role:'Spettro del vuoto',weapon:'Chakram Eclisse',detail:'Lame astrali rotanti che saltano fra i bersagli. La super evoca una corona di 32 falci spettrali.',color:'#c7a0fa',coat:'#443566',hp:85,speed:305,damage:29,rate:.36,shots:1,pierce:1,super:'ECLISSE DELLE ANIME'}
];
let selectedHero=0;
let previousOffers=[];
function selectHero(index){selectedHero=index;document.querySelectorAll('.hero-card').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
heroes.forEach((h,i)=>{const b=document.createElement('button');b.className='hero-card';b.setAttribute('aria-label',h.name+', '+h.role+', '+h.weapon);b.innerHTML='<canvas width="260" height="164" aria-hidden="true"></canvas><b>'+h.name+'</b><small>'+h.weapon+'</small>';b.onclick=()=>selectHero(i);$('roster').append(b);});
selectHero(0);

let W=2800,H=2200,viewW=innerWidth,viewH=innerHeight,zoom=1,camera={x:0,y:0},dpr=1, mode='menu', palette=palettes[0], keys={}, last=0, time=0;
let player, enemies=[], bullets=[], gems=[], particles=[], rings=[], labels=[], enemyBullets=[];
let bossMode=false;
let wave=1, waveTime=30, spawnTimer=0, shootTimer=0, score=0, kills=0, combo=0, comboTime=0, shake=0;
let announceTime=0, pendingUpgrades=0, resumeMode='play', best=0, arena=0, runTime=0, bossSpawned=false;
let drops=[], heat=0, furyTime=0, furyCount=0, peakCombo=0, eliteTimer=10, waveEvent=null;
const waveEvents=[
 {name:'CACCIA LIBERA',hint:'Elimina e carica la Furia',spawn:1,speed:1,xp:1},
 {name:'CORSA ALL’ORO',hint:'Cristalli doppi · raccogli tutto!',spawn:1,speed:1,xp:2},
 {name:'SCIAME',hint:'Più predoni · meno vita',spawn:.75,speed:1,xp:1},
 {name:'ALTA TENSIONE',hint:'Nemici rapidi · scatto ricaricato prima',spawn:1,speed:1.2,xp:1}
];
function beginWave(){
 if(wave>1)sfx('wave');
 waveEvent=wave%4===0?{...waveEvents[0],name:'CACCIA AL BOSS',hint:'Abbatti il gigante · bottino garantito'}:waveEvents[(wave-1-Math.floor(wave/4))%waveEvents.length];
 if(campaignRun!==null){const m=missions[campaignRun];waveEvent={...waveEvents[m.event]};if(m.kind==='boss'&&wave===m.waves)waveEvent={...waveEvents[0],name:'GORATH / RE DEI PREDONI'};}
 if(bossMode)waveEvent={...waveEvents[0],name:'BOSS INFINITI',hint:'Un boss per ondata · orde senza fine'};
 eliteTimer=8;enemyBullets=[];
 $('eventName').textContent=waveEvent.name;
}
function addHeat(amount){
 if(furyTime>0)return;
 heat=Math.min(100,heat+amount);
 if(heat>=100){heat=0;furyTime=7;furyCount++;player.dashCd=0;player.novaCd=Math.max(0,player.novaCd-4);ring(player.x,player.y,'#ffcd65',220);announce('FURIA!');sfx('upgrade');}
}
function dropLoot(x,y,kind){drops.push({x:clamp(x,30,W-30),y:clamp(y,115,H-35),kind,life:14});if(drops.length>18)drops.shift();}
function collectLoot(d){
 if(d.kind==='heal'){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.25);animateHero('heal');announce('VITA +25%');}
 if(d.kind==='magnet'){for(const g of gems){g.x=player.x;g.y=player.y;}announce('MAGNETE');}
 if(d.kind==='overdrive'){addHeat(40);player.novaCd=Math.max(0,player.novaCd-5);player.dashCd=0;if(furyTime<=0)announce('REATTORE');}
 d.life=0;ring(d.x,d.y,'#66ffcf',90);sfx('upgrade');
}
try {best=Number(localStorage.getItem('neon-requiem-best'))||0;} catch {}
$('best').textContent=String(best).padStart(6,'0');
function resize(){viewW=innerWidth;viewH=innerHeight;zoom=touchDevice?(viewW<600?.72:.82):1;dpr=Math.min(window.devicePixelRatio||1,touchDevice?1.5:2);for(const c of [canvas,textCanvas]){c.width=Math.round(viewW*dpr);c.height=Math.round(viewH*dpr);c.style.width=viewW+'px';c.style.height=viewH+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);textCtx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;if(player)followCamera(1);}
function followCamera(blend){camera.x+=(clamp(player.x-viewW/zoom/2,0,Math.max(0,W-viewW/zoom))-camera.x)*blend;camera.y+=(clamp(player.y-viewH/zoom*.52,0,Math.max(0,H-viewH/zoom))-camera.y)*blend;}
function visible(x,y,pad=110){return x>camera.x-pad&&x<camera.x+viewW/zoom+pad&&y>camera.y-pad&&y<camera.y+viewH/zoom+pad;}
function enemyLimit(){return bossMode?700:360;}
function isBossWave(){return bossMode||(campaignRun===null?wave%4===0:missions[campaignRun].kind==='boss'&&wave===missions[campaignRun].waves);}
function bossKind(){return bossMode?(wave-1)%3:campaignRun===null?Math.max(0,Math.floor(wave/4)-1)%3:0;}
function assaultWave(){return bossMode||campaignRun===null?(wave%4===0||wave>=10):wave===missions[campaignRun].waves;}
function ambush(count){for(let i=0;i<count&&enemies.length<enemyLimit();i++)spawn(i%5===0?'shooter':i%3===0?'runner':'normal');}

addEventListener('resize',resize);resize();

// Pointer capture leaves the second finger free for abilities.
const stick={id:null,x:0,y:0,cx:0,cy:0,radius:0};
function resetStick(){const id=stick.id,base=$('joystick');stick.id=null;stick.x=stick.y=0;base.classList.remove('active');for(const prop of ['left','top','bottom'])base.style.removeProperty(prop);$('joystickKnob').style.transform='translate(-50%,-50%)';if(id!==null&&base.hasPointerCapture(id))base.releasePointerCapture(id);}
function placeStick(){const base=$('joystick');base.style.left=(stick.cx-base.offsetWidth/2)+'px';base.style.top=(stick.cy-base.offsetHeight/2)+'px';base.style.bottom='auto';}
function moveStick(e){if(e.pointerId!==stick.id)return;let x=e.clientX-stick.cx,y=e.clientY-stick.cy;const distance=Math.hypot(x,y),radius=stick.radius;if(distance>radius){const excess=1-radius/distance;stick.cx+=x*excess;stick.cy+=y*excess;x*=radius/distance;y*=radius/distance;placeStick();}stick.x=distance<8?0:x/radius;stick.y=distance<8?0:y/radius;$('joystickKnob').style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;}
document.addEventListener('pointerdown',e=>{const base=$('joystick');if(mode!=='play'||stick.id!==null||getComputedStyle(base).display==='none'||e.pointerType==='mouse'&&e.button!==0)return;if(e.target.closest('button,a,select,input,dialog')||e.clientY<document.querySelector('header').getBoundingClientRect().bottom||e.clientX>innerWidth*.55)return;e.preventDefault();stick.id=e.pointerId;stick.cx=e.clientX;stick.cy=e.clientY;stick.radius=base.offsetWidth*.33;placeStick();base.classList.add('active');base.setPointerCapture(e.pointerId);moveStick(e);});
document.addEventListener('pointermove',moveStick);
for(const event of ['onpointerup','onpointercancel','onlostpointercapture'])$('joystick')[event]=e=>{if(e.pointerId===stick.id)resetStick();};
addEventListener('blur',resetStick);
addEventListener('resize',resetStick);
addEventListener('visibilitychange',()=>{if(document.hidden){resetStick();keys={};if(mode==='play')pause();}});

const fullscreenButton=$('fullscreenButton');
function syncFullscreen(){const active=!!(document.fullscreenElement||document.webkitFullscreenElement);fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenButton.setAttribute('aria-label',active?'Esci da schermo intero':'Attiva schermo intero');fullscreenButton.title=active?'Esci da schermo intero (F)':'Schermo intero (F)';$('fullscreenLabel').textContent=active?'ESCI SCHERMO INTERO':'SCHERMO INTERO';resize();}
let displayNoticeTimer;
fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit.call(document);}else{const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request)throw new Error('unavailable');await request.call(root);}syncFullscreen();}catch{const notice=$('displayNotice');notice.textContent='Schermo intero non disponibile in questo browser.';notice.hidden=false;clearTimeout(displayNoticeTimer);displayNoticeTimer=setTimeout(()=>notice.hidden=true,7000);}};
addEventListener('fullscreenchange',syncFullscreen);
addEventListener('webkitfullscreenchange',syncFullscreen);

// Selected, attributed playlist; generated tones remain available for effects.
const music={ctx:null,master:null,bus:null,recording:null,gap:null,playlistActive:false,playlistIndex:0,nextPlaylistStart:0,enabled:preferences.audio,timer:null,step:0,next:0,track:0};
function initAudio(){if(!music.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;music.ctx=new AC();music.master=music.ctx.createGain();music.master.gain.value=music.enabled?.42*preferences.sfxVolume/80:0;music.master.connect(music.ctx.destination);music.bus=music.ctx.createGain();music.bus.gain.value=.65;music.bus.connect(music.master);}music.ctx.resume().catch(()=>{});if(!music.recording){music.recording=document.createElement('audio');music.recording.loop=false;music.recording.addEventListener('ended',()=>{if(!music.playlistActive)return;music.gap=setTimeout(()=>{music.gap=null;if(music.playlistActive)playPlaylistTrack((music.playlistIndex+1)%battlePlaylist.length);},2500);});music.recording.volume=.6*preferences.musicVolume/100;music.recording.muted=!music.enabled;}}
function tone(freq,duration,kind='sine',volume=.1,at,slide,attack=.008){if(!music.ctx)return;const c=music.ctx,t=at??c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=kind;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(music.bus);o.start(t);o.stop(t+duration+.02);}
function noise(at,vol=.05,duration=.07){if(!music.ctx)return;const c=music.ctx,b=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=b;f.type='highpass';f.frequency.value=6500;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(music.bus);s.start(at);}
// Local CC0 recordings; bounded voice pools work even when opened with file://.
// Chapter one: progress is independent from Arcade scores and temporary upgrades.
const missions=[
 {title:'Imboscata nella polvere',kind:'survive',waves:2,duration:28,event:0,brief:'AXIOM: Quel segnale non dovrebbe esistere. VULKOR: Allora restiamo vivi abbastanza da scoprirne la fonte.',goal:'Decifra i 3 segnali restando nei cerchi, resisti alle ondate e raggiungi l’estrazione.'},
 {title:'Le torri del silenzio',kind:'destroy',waves:2,duration:30,event:2,brief:'NYX: Tre ripetitori tengono prigioniere le voci. BASTION: Li riconosco. E questo mi preoccupa.',goal:'Distruggi i 3 ripetitori, respingi i rinforzi e raggiungi l’estrazione.'},
 {title:'L’ultima scintilla',kind:'defend',waves:2,duration:32,event:1,brief:'BASTION: Questo generatore può leggere il segnale. AXIOM: Accendilo. Noi teniamo lontani i predoni.',goal:'Proteggi il generatore per due ondate. Avvicinati per ripararlo quando la zona è libera, poi raggiungi l’estrazione.'},
 {title:'Memorie del convoglio',kind:'recover',waves:2,duration:32,event:3,brief:'BASTION: Quel convoglio… l’ho scortato io. NYX: Le memorie sono ancora qui. Raccogliamole prima di giudicare.',goal:'Scarica le 3 memorie restando vicino per 1,5 secondi. Preparati alle imboscate e raggiungi l’estrazione.'},
 {title:'Il re dei predoni',kind:'boss',waves:2,duration:30,event:0,brief:'GORATH: Il segnale vi ha chiamati tutti e quattro? Bene. La Forgia rivuole ciò che le appartiene. VULKOR: Vieni a prenderlo.',goal:'Supera l’assalto, sconfiggi Gorath e le sue orde, poi raggiungi l’estrazione.'}
];
const comics={
 intro:[
  ['IL SEGNALE NELLA POLVERE','NARRATORE','La Forgia era spenta da vent’anni. Poi, una notte, tutti i ricevitori del Canyon pronunciarono quattro nomi.',0,'Nel canyon, una torre abbandonata trasmette un segnale rosso.'],
  ['UNA MEMORIA IMPOSSIBILE','AXIOM','Questa frequenza è nella mia memoria. È più antica del giorno in cui sono stato costruito.',1,'Axiom osserva il segnale nel deserto.'],
  ['QUATTRO STRADE','VULKOR','I predoni hanno bruciato la mia valle seguendo quel richiamo. Se cercate la fonte, veniamo con voi.',2,'Vulkor, Bastion e Nyx raggiungono Axiom nel canyon.'],
  ['UN PATTO NELLA POLVERE','NYX','Le voci arrivano dal convoglio di Gorath. Non chiedono aiuto. Ci stanno aspettando.',3,'I quattro eroi si uniscono davanti al passo occupato dai predoni.']
 ],
 ending:[
  ['IL RE CADE','GORATH','Io custodivo il passo… per tenervi lontani. Il cuore non alimenta la Forgia. La tiene chiusa.',4,'Gorath sconfitto lascia intravedere una luce verde oltre il canyon.'],
  ['IL QUINTO SEGNALE','BASTION','Ora ricordo. Non scortavo armi. Portavo qui quattro nuclei. Uno per ciascuno di noi.',2,'Bastion mostra ai compagni il ricordo dei quattro nuclei.'],
  ['OLTRE IL CANYON','AXIOM','C’è un’altra trasmissione. Viene dal Bosco dei Funghi. E questa volta qualcuno ci ha risposto.',3,'La squadra guarda verso il bosco luminoso oltre il passo.'],
  ['IL BOSCO ASCOLTA','MYCELIA','Finalmente vi siete ritrovati. Venite. Vi racconterò chi vi ha separati.',5,'La sagoma di Mycelia emerge fra funghi e spore luminose.']
 ]
};
let campaignRun=null,missionState=null,comicPages=[],comicIndex=0,comicDone=null;
let campaignSave={completed:0,intro:false};
try{const saved=JSON.parse(localStorage.getItem('killme2-campaign-v1'));if(saved&&Number.isInteger(saved.completed)&&saved.completed>=0&&saved.completed<=5)campaignSave={completed:saved.completed,intro:saved.intro===true};}catch{}
function saveCampaign(){try{localStorage.setItem('killme2-campaign-v1',JSON.stringify(campaignSave));$('campaignProgress').textContent=campaignSave.completed+'/5 missioni completate · '+(campaignSave.completed===5?'Capitolo 1 concluso. Il Bosco dei Funghi arriverà nel prossimo capitolo.':'Progressi salvati su questo browser');}catch{$('campaignProgress').textContent=campaignSave.completed+'/5 missioni completate · salvataggio non disponibile in questo browser';}}
function hideCampaign(){ $('campaignMap').hidden=true;$('comicScreen').hidden=true;$('missionObjective').hidden=true; }
function showCampaignMap(){
 bossMode=false;resetStick();keys={};saveBest();stopSamples();campaignRun=null;missionState=null;mode='map';document.body?.classList.remove('in-game');$('menu').hidden=true;$('hud').hidden=true;$('overlay').hidden=true;$('comicScreen').hidden=true;$('missionObjective').hidden=true;$('campaignMap').hidden=false;startMenuMusic();
 $('campaignHeroes').replaceChildren();heroes.forEach((h,i)=>{const b=document.createElement('button');b.textContent=h.name;b.setAttribute('aria-pressed',String(i===selectedHero));b.onclick=()=>{selectHero(i);showCampaignMap();focusControl('campaignHero'+i);};b.id='campaignHero'+i;$('campaignHeroes').append(b);});
 $('missionNodes').replaceChildren();missions.forEach((m,i)=>{const b=document.createElement('button');b.className='mission-node'+(i<campaignSave.completed?' completed':i===campaignSave.completed?' current':'');b.setAttribute('aria-label','Missione '+(i+1)+': '+m.title+(i<campaignSave.completed?' · completata':i===campaignSave.completed?' · disponibile':' · bloccata'));if(i===campaignSave.completed)b.setAttribute('aria-current','step');b.disabled=i>campaignSave.completed;b.innerHTML='<b>'+String(i+1).padStart(2,'0')+'</b><strong>'+m.title+'</strong><small>'+(b.disabled?'Bloccata · completa la precedente':i<campaignSave.completed?'✓ Completata · rigioca':'▶ Gioca · '+m.goal)+'</small>';b.onclick=()=>briefMission(i);$('missionNodes').append(b);});
 $('replayEnding').hidden=campaignSave.completed<5;saveCampaign();syncControls();focusControl('campaignHero'+selectedHero);
}
function showComic(pages,done){resetStick();keys={};mode='comic';comicPages=pages;comicIndex=0;comicDone=done;$('campaignMap').hidden=true;$('menu').hidden=true;$('hud').hidden=true;$('overlay').hidden=true;$('comicScreen').hidden=false;syncControls();renderComic();focusControl('comicNext');}
function renderComic(){
 const panel=comicPages[comicIndex];$('comicCounter').textContent='KILLME2 / VIGNETTA '+(comicIndex+1)+' DI '+comicPages.length;$('comicTitle').textContent=panel[0];$('comicSpeaker').textContent=panel[1];$('comicText').textContent=panel[2];$('comicArt').setAttribute('aria-label',panel[4]);$('comicPrevious').disabled=comicIndex===0;$('comicNext').textContent=comicIndex===comicPages.length-1?'CONTINUA':'AVANTI →';
 $('comicScreen').setAttribute('data-narrator',String(panel[1]==='NARRATORE'));
 paintComicPanel();
}
const comicAtlases={};
let comicPaintVersion=0;
function paintComicPanel(){
 const version=++comicPaintVersion,art=$('comicArt'),c=art.getContext('2d'),key=comicPages===comics.ending?'ending':'intro',index=comicIndex;
 c.clearRect(0,0,art.width,art.height);$('comicLoadStatus').hidden=false;$('comicLoadStatus').textContent='CARICAMENTO VIGNETTA…';
 if(typeof Image==='undefined')return;
 const paint=img=>{
  if(version!==comicPaintVersion||mode!=='comic')return;
  // Each original atlas contains four equal panels; sample only the selected quadrant.
  const w=img.naturalWidth/2,h=img.naturalHeight/2;art.width=w;art.height=h;c.imageSmoothingEnabled=false;
  c.drawImage(img,(index%2)*w,Math.floor(index/2)*h,w,h,0,0,art.width,art.height);$('comicLoadStatus').hidden=true;
 };
 const entry=comicAtlases[key];if(entry?.image.complete&&entry.image.naturalWidth){paint(entry.image);return;}
 if(entry){entry.ready.then(paint).catch(()=>{if(version===comicPaintVersion)$('comicLoadStatus').textContent='Vignetta non disponibile. Puoi continuare a leggere la storia.';});return;}
 const img=new Image();const ready=new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('comic atlas unavailable'));});comicAtlases[key]={image:img,ready};
 img.src='assets/comics/chapter-01-'+key+'-8bit.png';ready.then(paint).catch(()=>{if(version===comicPaintVersion)$('comicLoadStatus').textContent='Vignetta non disponibile. Puoi continuare a leggere la storia.';});
}

function finishComic(){const done=comicDone;comicDone=null;$('comicScreen').hidden=true;if(done)done();}
$('comicNext').onclick=()=>{if(comicIndex<comicPages.length-1){comicIndex++;renderComic();}else finishComic();};
$('comicPrevious').onclick=()=>{if(comicIndex>0){comicIndex--;renderComic();}};$('comicSkip').onclick=finishComic;
$('campaignButton').onclick=()=>{if(campaignSave.intro)showCampaignMap();else showComic(comics.intro,()=>{campaignSave.intro=true;saveCampaign();showCampaignMap();});};
$('replayIntro').onclick=()=>showComic(comics.intro,showCampaignMap);$('replayEnding').onclick=()=>showComic(comics.ending,showCampaignMap);$('mapHome').onclick=home;
function briefMission(index){
 if(index<0||index>=missions.length||index>campaignSave.completed)return;
 bossMode=false;campaignRun=index;missionState=null;mode='brief';$('campaignMap').hidden=true;const m=missions[index];showModal('CAPITOLO 01 / MISSIONE '+(index+1),m.title,m.brief+'\n\n'+m.goal+' Eroe: '+heroes[selectedHero].name+'. Vita e potenziamenti ripartono a ogni missione.');$('continueButton').hidden=false;$('continueButton').textContent='INIZIA MISSIONE';$('continueButton').onclick=newRun;$('homeButton').textContent='TORNA ALLA MAPPA';focusControl('continueButton');
}
function prepareMission(){
 const m=missions[campaignRun];missionState={done:0,hp:100,objects:[],elapsed:0,signal:0,pulse:0,extracting:false,exit:{x:W*.84,y:H*.22}};arena=0;palette=palettes[0];waveTime=m.duration;beginWave();
 const points=[[.28,.34],[.73,.48],[.43,.76]];
 if(m.kind==='destroy')for(const [fx,fy] of points){spawn('tank');const e=enemies[enemies.length-1];Object.assign(e,{x:W*fx,y:clamp(H*fy,130,H-40),speed:0,hp:180,maxHp:180,relay:true,r:28});}
 if(m.kind==='recover')missionState.objects=points.map(([fx,fy])=>({fx,fy,collected:false,progress:0}));
 $('missionObjective').hidden=false;$('arenaName').textContent='CANYON / '+m.title+' / '+player.hero.name;announce('MISSIONE '+(campaignRun+1));
}
function missionTick(dt){
 const m=missions[campaignRun],s=missionState;s.elapsed+=dt;
 if(s.extracting){$('missionObjective').textContent='ESTRAZIONE / raggiungi il faro verde';if(player.hp>0&&Math.hypot(player.x-s.exit.x,player.y-s.exit.y)<65){endRun(true);return false;}return true;}
 if(m.kind==='survive'){const sites=[[.38,.46],[.63,.35],[.62,.66]],site=sites[Math.min(s.done,2)];if(s.done<3){if(Math.hypot(player.x-W*site[0],player.y-H*site[1])<90)s.signal+=dt;if(s.signal>=3){s.signal=0;s.done++;ambush(14+s.done*4);announce('SEGNALE '+s.done+' / 3 · PREDONI IN ARRIVO');}}}
 if(m.kind==='defend'){const near=Math.hypot(player.x-W/2,player.y-H*.55)<100,contested=enemies.some(e=>e.hp>0&&Math.hypot(e.x-W/2,e.y-H*.55)<130);if(near&&!contested)s.hp=Math.min(100,s.hp+dt*2.5);s.pulse+=dt;if(s.pulse>14&&waveTime>0){s.pulse=0;ambush(14);announce('ASSALTO AL GENERATORE!');}}

 if(m.kind==='recover')for(const o of s.objects)if(!o.collected){const near=Math.hypot(player.x-W*o.fx,player.y-clamp(H*o.fy,130,H-40))<65;o.progress=near?o.progress+dt:Math.max(0,o.progress-dt*.5);if(o.progress>=1.5){o.collected=true;s.done++;ambush(20);dropLoot(W*o.fx,H*o.fy,'overdrive');sfx('upgrade');announce(['BASTION: Non erano armi. Erano nuclei.','NYX: Qualcuno ha cancellato questi nomi.','AXIOM: I quattro nuclei… siamo noi.'][s.done-1]);}}
 if(m.kind==='defend'){const x=W/2,y=H*.55;for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<55)s.hp=Math.max(0,s.hp-dt*(e.elite?9:4));}
 $('missionObjective').textContent=m.kind==='destroy'?'RIPETITORI DISTRUTTI '+s.done+' / 3':m.kind==='recover'?'MEMORIE RECUPERATE '+s.done+' / 3':m.kind==='defend'?'GENERATORE '+Math.ceil(s.hp)+'% · avvicinati per ripararlo':m.kind==='survive'?'SEGNALI '+s.done+' / 3 · resta nel cerchio '+Math.floor(s.signal)+'/3s':m.goal;
 if(m.kind==='defend'&&s.hp<=0){endRun(false);return false;}return true;
}
function advanceMission(){
 const m=missions[campaignRun];if(missionState.extracting)return;if(['survive','destroy','recover'].includes(m.kind)&&missionState.done<3)return;
 if(wave<m.waves){wave++;waveTime=m.duration;bossSpawned=false;beginWave();player.hp=Math.min(player.maxHp,player.hp+12);player.dashCd=0;for(const g of gems){g.x=player.x;g.y=player.y;}announce(m.kind==='boss'?'GORATH TI ASPETTA':'ULTIMA ONDATA');return;}
 missionState.extracting=true;ambush(26);announce('VIA LIBERA / RAGGIUNGI L’ESTRAZIONE');
}
function endMission(win){
 mode='end';saveBest();if(win){campaignSave.completed=Math.max(campaignSave.completed,campaignRun+1);saveCampaign();}
 const m=missions[campaignRun];showModal('MISSIONE '+(campaignRun+1)+(win?' COMPLETATA':' FALLITA'),win?m.title:'RIPROVIAMOCI',win?'Il passo è libero. La squadra prosegue insieme.':m.kind==='defend'&&missionState.hp<=0?'Il generatore è stato distrutto. Intercetta i predoni prima che lo raggiungano.':'La squadra si ritira. I livelli sbloccati restano disponibili.');$('continueButton').hidden=false;$('continueButton').textContent=win?(campaignRun===4?'LEGGI IL FINALE':'CONTINUA SULLA MAPPA'):'RIPROVA MISSIONE';$('continueButton').onclick=win?(campaignRun===4?()=>showComic(comics.ending,showCampaignMap):showCampaignMap):newRun;$('homeButton').textContent='TORNA ALLA MAPPA';focusControl('continueButton');
}
function missionTargets(){
 if(campaignRun===null||!missionState)return [];
 const m=missions[campaignRun],s=missionState;
 if(s.extracting)return [{...s.exit,label:'ESTRAZIONE'}];
 if(m.kind==='destroy')return enemies.filter(e=>e.relay&&e.hp>0).map(e=>({...e,label:'TORRE'}));
 if(m.kind==='recover')return s.objects.filter(o=>!o.collected).map(o=>({x:W*o.fx,y:H*o.fy,label:'MEMORIA'}));
 if(m.kind==='defend')return [{x:W/2,y:H*.55,label:'GENERATORE'}];
 if(m.kind==='survive'&&s.done<3){const p=[[.38,.46],[.63,.35],[.62,.66]][s.done];return [{x:W*p[0],y:H*p[1],label:'SEGNALE'}];}
 return [];
}
function drawNavigator(){
 const targets=missionTargets().sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
 if(!targets.length)return;const t=targets[0],sx=(t.x-camera.x)*zoom,sy=(t.y-camera.y)*zoom;
 if(sx>38&&sx<viewW-38&&sy>150&&sy<viewH-170)return;
 const x=clamp(sx,48,viewW-48),y=clamp(sy,viewH<500?110:170,viewH-180),a=Math.atan2(sy-y,sx-x);
 textCtx.save();textCtx.translate(x,y);textCtx.rotate(a);textCtx.fillStyle='#66ffcf';textCtx.beginPath();textCtx.moveTo(14,0);textCtx.lineTo(-7,-8);textCtx.lineTo(-7,8);textCtx.closePath();textCtx.fill();textCtx.restore();textCtx.save();textCtx.textAlign='center';textCtx.font='11px system-ui';textCtx.fillStyle='#fff4dc';textCtx.fillText(t.label,x,y+24);textCtx.restore();
}
function drawMission(){
 if(campaignRun===null||!missionState)return;const m=missions[campaignRun];
 if(missionState.extracting){const e=missionState.exit;pixelRing(e.x,e.y,65+Math.sin(time*4)*6,'#66ffcf');rect(e.x-8,e.y-45,16,65,'#66ffcf');return;}
 if(m.kind==='survive')for(const t of missionTargets()){pixelRing(t.x,t.y,90,'#72e3ed');pixelRing(t.x,t.y,30+missionState.signal*16,'#66ffcf');}
 if(m.kind==='recover')for(const o of missionState.objects)if(!o.collected){const x=W*o.fx,y=clamp(H*o.fy,130,H-40);pixelRing(x,y,45,'#66ffcf');rect(x-30,y+28,60*(o.progress/1.5),5,'#ffdb77');rect(x-9,y-12,18,24,'#66ffcf');rect(x-3,y-6,6,12,'#fff4dc');}
 if(m.kind==='defend'){const x=W/2,y=H*.55;rect(x-30,y-35,60,70,'#344b63');rect(x-18,y-24,36,42,'#72e3ed');rect(x-35,y-48,70,7,'#101426');rect(x-35,y-48,70*missionState.hp/100,7,'#66ffcf');pixelRing(x,y,55,'#72e3ed');}
 for(const e of enemies)if(e.relay&&e.hp>0){rect(e.x-17,e.y-38,34,68,'#26354b');rect(e.x-10,e.y-28,20,12,'#f5879b');pixelRing(e.x,e.y,38,'#f5879b');}
}
const samplePools={},sampleLast={};
const sampleDefs={shoot:['laserSmall_000',.20],rocket:['laserLarge_000',.32],blade:['laserRetro_003',.20],hit:['impactMetal_000',.24],dash:['forceField_000',.22],nova:['lowFrequency_explosion_000',.55],explosion:['explosionCrunch_000',.34],boss:['forceField_004',.45],gem:['laserRetro_001',.08],upgrade:['forceField_002',.30]};
function stopSamples(){for(const pool of Object.values(samplePools))for(const a of pool){a.pause();a.currentTime=0;}}
function sfx(type){
 if(!music.enabled||preferences.sfxVolume===0)return;
 const now=Date.now();if(now-(sampleLast[type]||0)<(type==='gem'?90:type==='hit'||type==='parry'?65:35))return;sampleLast[type]=now;
 const def=sampleDefs[type];if(!def||typeof Audio==='undefined'){synthSfx(type);return;}
 const pool=samplePools[type]||(samplePools[type]=Array.from({length:type==='shoot'?6:3},()=>{const a=new Audio('assets/audio/kenney/Audio/'+def[0]+'.ogg');a.preload='auto';return a;}));
 const a=pool.find(a=>a.paused||a.ended);if(!a)return;a.currentTime=0;a.volume=Math.min(1,def[1]*preferences.sfxVolume/80);a.muted=!music.enabled;a.playbackRate=type==='upgrade'||type==='boss'?1:rand(.93,1.07);a.play().catch(()=>synthSfx(type));
}
const battlePlaylist=['soundtrack-preview-2/01-mega-hyper-ultrastorm.mp3','soundtrack-preview-2/05-blown-away.mp3','soundtrack-preview-2/10-furious-freak.mp3'];
try{const saved=Number(localStorage.getItem('wild-bunch-next-playlist-start'));if(Number.isInteger(saved)&&saved>=0&&saved<battlePlaylist.length)music.nextPlaylistStart=saved;}catch{}
function playPlaylistTrack(index){music.playlistIndex=index;music.recording.src=battlePlaylist[index];music.recording.currentTime=0;music.recording.play().catch(()=>{});}
function stopMusic(){clearInterval(music.timer);music.timer=null;music.playlistActive=false;if(music.gap!==null){clearTimeout(music.gap);music.gap=null;}if(music.recording)music.recording.pause();}
function startMenuMusic(){initAudio();stopMusic();if(!music.recording)return;music.recording.loop=true;music.recording.src='soundtrack-preview-3/05-club-diver.mp3';music.recording.currentTime=0;music.recording.play().catch(()=>{});}
function unlockMenuAudio(){if(mode==='menu'&&music.enabled&&(!music.recording||music.recording.paused))startMenuMusic();}
addEventListener('pointerdown',unlockMenuAudio);
addEventListener('keydown',unlockMenuAudio);
function startMusic(newMatch=false){stopMusic();if(!music.ctx)return;music.recording.loop=false;music.playlistActive=true;const first=newMatch?music.nextPlaylistStart:music.playlistIndex;if(newMatch){music.nextPlaylistStart=(first+1)%battlePlaylist.length;try{localStorage.setItem('wild-bunch-next-playlist-start',String(music.nextPlaylistStart));}catch{}}playPlaylistTrack(first);}
function synthSfx(type){if(!music.enabled||!music.ctx)return;if(type==='magic'){const t=music.ctx.currentTime;/* Soft astral pulse: sine waves, gentle onset, no metallic transient. */tone(520,.22,'sine',.035,t,310,.03);tone(780,.26,'sine',.012,t+.025,620,.035);}if(type==='rocket'||type==='explosion'){tone(140,.22,'sawtooth',.12,undefined,30);tone(65,.3,'triangle',.1,undefined,22);}if(type==='blade'||type==='slash')tone(900,.14,'sawtooth',.045,undefined,110);if(type==='hurt')tone(160,.18,'square',.08,undefined,45);if(type==='parry'){tone(1200,.09,'triangle',.06,undefined,1900);}if(type==='boss'){tone(160,.5,'sawtooth',.1,undefined,45);}if(type==='wave'){[330,440,660].forEach((f,i)=>tone(f,.18,'triangle',.08,music.ctx.currentTime+i*.1));}if(type==='shoot')tone(650,.045,'triangle',.025,undefined,280);if(type==='hit')tone(120,.08,'sawtooth',.045,undefined,35);if(type==='dash')tone(200,.15,'sawtooth',.07,undefined,900);if(type==='nova'){tone(90,.65,'sawtooth',.16,undefined,25);tone(600,.6,'sine',.1,undefined,50);}if(type==='gem')tone(850+Math.random()*300,.07,'sine',.025);if(type==='upgrade'){[440,550,660,880].forEach((f,i)=>tone(f,.25,'triangle',.12,music.ctx.currentTime+i*.08));}}
function applyAudioPreferences(){
 if(music.master)music.master.gain.value=music.enabled?.42*preferences.sfxVolume/80:0;
 if(music.recording){music.recording.volume=.6*preferences.musicVolume/100;music.recording.muted=!music.enabled;}
 for(const [type,pool] of Object.entries(samplePools))for(const audio of pool){audio.muted=!music.enabled;audio.volume=Math.min(1,sampleDefs[type][1]*preferences.sfxVolume/80);}
 $('audioLabel').textContent=music.enabled?'AUDIO ON':'AUDIO OFF';$('muteButton').setAttribute('aria-pressed',String(music.enabled));$('muteButton').setAttribute('aria-label',music.enabled?'Disattiva audio':'Attiva audio');$('muteButton').title=(music.enabled?'Disattiva audio':'Attiva audio')+' (M)';
}
$('muteButton').onclick=()=>{initAudio();music.enabled=!music.enabled;preferences.audio=music.enabled;applyAudioPreferences();savePreferences();if(music.enabled&&mode==='menu'&&music.recording?.paused)startMenuMusic();};
for(const id of ['musicVolume','sfxVolume']){const input=$(id);input.value=preferences[id];$(id+'Value').textContent=preferences[id]+'%';input.oninput=()=>{preferences[id]=+input.value;$(id+'Value').textContent=input.value+'%';initAudio();applyAudioPreferences();savePreferences();};}
$('graphicsQuality').value=preferences.quality;$('graphicsQuality').onchange=()=>{preferences.quality=$('graphicsQuality').value;if(preferences.quality==='low')particles=particles.slice(0,120);savePreferences();};
for(const [id,key] of [['screenShake','shake'],['scanlines','scanlines']]){$(id).checked=preferences[key];$(id).onchange=()=>{preferences[key]=$(id).checked;document.body.classList.toggle('no-scanlines',!preferences.scanlines);savePreferences();};}
document.body.classList.toggle('no-scanlines',!preferences.scanlines);applyAudioPreferences();
let settingsTrigger=null,settingsPaused=false;
function openSettings(event){settingsTrigger=event.currentTarget;settingsPaused=mode==='play';if(settingsPaused)pause();resetStick();keys={};$('settingsDialog').showModal();}
$('settingsButton').onclick=openSettings;$('quickSettingsButton').onclick=openSettings;
$('closeSettingsButton').onclick=()=>$('settingsDialog').close();
$('settingsDialog').addEventListener('close',()=>{if(settingsPaused&&mode==='pause')resume();settingsPaused=false;settingsTrigger?.focus({preventScroll:true});});
$('arenaSelect').onchange=()=>palette=palettes[+$('arenaSelect').value];
function burst(x,y,color,count=15,force=150){const reduced=preferences.quality==='low',limit=reduced?120:touchDevice?240:1100;count=Math.min(Math.ceil(count*(reduced?.25:touchDevice?.5:1)),Math.max(0,limit-particles.length));for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(force*.2,force);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.65),max:.65,color,size:rand(1.5,4)});}if(particles.length>1100)particles.splice(0,particles.length-1100);}
function ring(x,y,color,r=100){if(rings.length>=(touchDevice?32:100))return;rings.push({x,y,color,r:0,max:r,life:.45});}
function announce(text){$('announcement').textContent=text;announceTime=2;}
function newRun(){hideCampaign();resetStick();keys={};releaseControlFocus();document.body?.classList.add('in-game');initAudio();startMusic(true);arena=+$('arenaSelect').value;palette=palettes[arena];const hero=heroes[selectedHero];previousOffers=[];player={ranks:{},regen:0,armor:0,xpBonus:0,critPower:3,projectileSpeed:1,reach:0,dashRecovery:1,novaRecovery:1,slow:0,lifesteal:0,chain:0,aura:0,auraTimer:0,execute:0,revives:0,bossDamage:0,killHeal:0,hero,aim:0,x:W/2,y:H/2,r:19,hp:hero.hp,maxHp:hero.hp,speed:hero.speed,damage:hero.damage,rate:hero.rate,shots:hero.shots,pierce:hero.pierce,crit:.1,magnet:115,level:1,xp:0,nextXp:12,dashCd:0,novaCd:0,dashTime:0,inv:1,dx:1,dy:0};enemies=[];bullets=[];enemyBullets=[];gems=[];particles=[];rings=[];labels=[];wave=1;waveTime=30;score=kills=combo=comboTime=runTime=shootTimer=spawnTimer=pendingUpgrades=0;bossSpawned=false;drops=[];heat=furyTime=furyCount=peakCombo=0;beginWave();mode='play';player.animClock=0;player.moving=false;animateHero('spawn');$('menu').hidden=true;$('hud').hidden=false;$('overlay').hidden=true;$('arenaName').textContent=palette.name+' / '+hero.name;document.querySelector('.abilities>button:last-child span').textContent=hero.super;announce(hero.name+(bossMode?' / BOSS INFINITI':' / ONDATA 01'));if(campaignRun!==null)prepareMission();followCamera(1);updateHud();syncControls();}
$('startButton').onclick=()=>{bossMode=false;campaignRun=null;missionState=null;newRun();};
$('bossButton').onclick=()=>{bossMode=true;campaignRun=null;missionState=null;newRun();};
$('creditsButton').onclick=()=>{keys={};$('creditsDialog').showModal();};
$('closeCreditsButton').onclick=()=>{$('creditsDialog').close();$('creditsButton').focus();};
function saveBest(){if(score>best){best=score;try{localStorage.setItem('neon-requiem-best',String(best));}catch{}$('best').textContent=String(best).padStart(6,'0');}}
function syncControls(){
 const playing=mode==='play',paused=mode==='pause';
 $('quickSettingsButton').hidden=mode==='menu';
 $('pauseButton').hidden=['menu','map','comic','brief'].includes(mode);$('pauseButton').disabled=!playing&&!paused;
 $('pauseButton').setAttribute('aria-label',paused?'Riprendi la partita':'Metti in pausa');
 $('pauseButton').setAttribute('aria-pressed',String(paused));
 $('pauseButton').title=paused?'Riprendi (Esc)':'Pausa (Esc)';$('pauseLabel').textContent=paused?'RIPRENDI':'PAUSA';
 $('hud').inert=!playing;
 $('dashButton').disabled=!playing||player.dashCd>0;$('novaButton').disabled=!playing||player.novaCd>0;
}
function focusControl(id){$(id).focus?.({preventScroll:true});}
function releaseControlFocus(){if(document.activeElement?.closest('button,a,select'))document.activeElement.blur();}
function showModal(eyebrow,title,description){$('homeButton').textContent=campaignRun===null?'TORNA AL MENU':'TORNA ALLA MAPPA';resetStick();keys={};$('overlay').classList.remove('upgrade-mode');$('overlay').hidden=false;$('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;$('modalDescription').textContent=description;$('modalDescription').hidden=!description;$('modalEyebrow').hidden=!eyebrow;$('choices').replaceChildren();$('continueButton').hidden=true;$('homeButton').hidden=false;syncControls();}
function home(){bossMode=false;hideCampaign();campaignRun=null;missionState=null;comicDone=null;resetStick();document.body?.classList.remove('in-game');stopSamples();saveBest();mode='menu';startMenuMusic();$('overlay').hidden=true;$('hud').hidden=true;$('menu').hidden=false;keys={};syncControls();focusControl('startButton');}
$('homeButton').onclick=()=>campaignRun===null?home():showCampaignMap();

function resume(){resetStick();keys={};mode='play';$('overlay').hidden=true;syncControls();releaseControlFocus();}
function pause(){if(mode==='play'){mode='pause';showModal('','PAUSA','');$('continueButton').textContent='RIPRENDI';$('continueButton').hidden=false;$('continueButton').onclick=resume;focusControl('continueButton');}else if(mode==='pause')resume();}
$('pauseButton').onclick=pause;
$('dashButton').onclick=()=>{if(mode==='play')dash();};
$('novaButton').onclick=()=>{if(mode==='play')nova();};
// Touch abilities fire on contact, including while another finger holds the stick.
for(const [id,action] of [['dashButton',dash],['novaButton',nova]])$(id).onpointerdown=e=>{if(e.pointerType==='mouse')return;e.preventDefault();if(mode==='play'&&!$(id).disabled)action();};
addEventListener('keydown',e=>{
 if($('settingsDialog').open||$('creditsDialog').open||e.ctrlKey||e.metaKey||e.altKey)return;
 if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;
 if(e.code==='Escape'){if(!e.repeat)pause();return;}
 if(e.code==='KeyF'||e.code==='KeyM'){e.preventDefault();if(!e.repeat)$(e.code==='KeyF'?'fullscreenButton':'muteButton').click();return;}
 // In menus, leave Space, Enter, arrows and Tab to native controls.
 if(mode!=='play')return;
 if(['Space','KeyE','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
  e.preventDefault();keys[e.code]=true;
  if(e.repeat)return;
  releaseControlFocus();
  if(e.code==='Space')dash();if(e.code==='KeyE')nova();
 }
});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};if(mode==='play')pause();});
function dash(){if(player.dashCd>0)return;animateHero('dash');player.dashCd=2.6*player.dashRecovery*(waveEvent===waveEvents[3]?.65:1);player.dashTime=.19;player.inv=.35;ring(player.x,player.y,palette.accent,75);sfx('dash');}
function nova(){if(player.novaCd>0)return;animateHero('super');player.novaCd=12*player.novaRecovery;player.inv=.7;shake=12;const h=player.hero;const radius=h.id==='knight'?330:h.id==='bomber'?440:360;ring(player.x,player.y,h.color,radius);burst(player.x,player.y,h.color,75,550);if(h.id==='gunslinger'||h.id==='ranger'){for(let i=0;i<32;i++){const a=TAU*i/32;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:1.8,pierce:2,hit:new Set(),kind:h.id,bounces:5,power:2.5});}}else{enemies.slice().forEach(e=>{const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<radius){damageEnemy(e,player.damage*(h.id==='knight'?9:7),true);if(h.id==='knight'){const a=Math.atan2(e.y-player.y,e.x-player.x);e.x+=Math.cos(a)*100;e.y+=Math.sin(a)*100;}}});}if(h.id==='bomber'){for(let i=0;i<12;i++){const a=i*TAU/12;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*440,vy:Math.sin(a)*440,life:2.5,pierce:0,hit:new Set(),kind:'bomber',power:2});}}if(h.id==='knight'){for(let i=1;i<5;i++)ring(player.x,player.y,i%2?h.color:'#ffe0b0',radius*i/4);}enemyBullets=enemyBullets.filter(b=>Math.hypot(b.x-player.x,b.y-player.y)>radius);announce(h.super);sfx('nova');}
function spawn(type){const side=Math.floor(rand(0,4));const left=Math.max(25,camera.x-70),right=Math.min(W-25,camera.x+viewW/zoom+70),top=Math.max(25,camera.y-70),bottom=Math.min(H-25,camera.y+viewH/zoom+70);let x=side===0?left:side===1?right:rand(left,right),y=side===2?top:side===3?bottom:rand(top,bottom);if(player&&Math.hypot(x-player.x,y-player.y)<240){const a=Math.atan2(y-player.y,x-player.x);x=clamp(player.x+Math.cos(a)*270,25,W-25);y=clamp(player.y+Math.sin(a)*270,25,H-25);}const boss=type==='boss';const hp=boss?(bossMode?780*(1+(wave-1)*.32+(wave-1)**2*.025):650+wave*130):(type==='tank'?75:type==='shooter'?38:25)*(1+wave*.19)*(waveEvent===waveEvents[2]?.7:1);enemies.push({x,y,type,hp,maxHp:hp,bossKind:bossKind(),damageScale:boss&&bossMode?1+(wave-1)*.12:1,phase:0,r:boss?62:type==='tank'?27:type==='runner'?15:20,speed:boss?(bossMode?43+55*(1-Math.exp(-(wave-1)/20)):43):type==='runner'?140+wave*3:type==='tank'?48:65+wave*3,cd:rand(1,3),hit:0,angle:rand(0,TAU),dashHit:false});}
function damageEnemy(e,amount,critical=false){if(e.hp<=0)return;amount*=(e.type==='boss'?1+player.bossDamage:1)*(furyTime>0?1.5:1);e.hp-=amount;e.hit=.1;if((Math.random()<.45||critical)&&labels.length<(touchDevice?32:100))labels.push({x:e.x+rand(-8,8),y:e.y-15,text:Math.round(amount),life:.6,color:critical?'#e9bd70':'#f6e9ce',big:critical});burst(e.x,e.y,palette.accent,3,70);if(e.hp<=0){if(e.relay&&missionState){missionState.done++;ambush(16+missionState.done*4);dropLoot(e.x,e.y,'heal');announce('RIPETITORE CADUTO / IMBOSCATA!');}player.hp=Math.min(player.maxHp,player.hp+player.killHeal);kills++;combo++;if(combo%10===0){player.novaCd=Math.max(0,player.novaCd-1);player.dashCd=Math.max(0,player.dashCd-.5);sfx('parry');}peakCombo=Math.max(peakCombo,combo);comboTime=3.5;addHeat(e.type==='boss'?35:e.elite?20:4);const mult=1+Math.min(4,Math.floor(combo/10));score+=Math.round((e.type==='boss'?1500:30)*mult);burst(e.x,e.y,e.type==='boss'?'#e9bd70':palette.enemy,e.type==='boss'?100:17,e.type==='boss'?400:160);ring(e.x,e.y,palette.enemy,e.type==='boss'?250:42);const value=(e.type==='boss'?35:e.elite?12:e.type==='tank'?4:2)*(waveEvent?.xp||1);if(e.elite||e.type==='boss')dropLoot(e.x,e.y,player.hp<player.maxHp*.55?'heal':['magnet','overdrive','heal'][Math.floor(rand(0,3))]);else if(kills%22===0)dropLoot(e.x,e.y,['heal','magnet','overdrive'][Math.floor(rand(0,3))]);gems.push({x:e.x,y:e.y,value,r:4,age:0});if(e.type==='boss'){sfx('nova');shake=18;announce('BOSS DISTRUTTO');}else if(combo===10||combo===25||combo===50)announce(combo===50?'MASSACRO ASSOLUTO':combo===25?'REAZIONE A CATENA':'COMBO × 10');sfx('hit');}}
const rarities={
 common:{name:'COMUNE',weight:60,stars:'◆'},
 rare:{name:'RARO',weight:27,stars:'◆◆'},
 epic:{name:'EPICO',weight:10,stars:'◆◆◆'},
 legendary:{name:'LEGGENDARIO',weight:3,stars:'◆◆◆◆'}
};
const upgrades=[
 {id:'core',rarity:'common',icon:'✦',name:'Nucleo instabile',tag:'ATTACCO',desc:'+8% danni a ogni grado.',apply:p=>p.damage*=1.08},
 {id:'clock',rarity:'common',icon:'»',name:'Grilletto rapido',tag:'CADENZA',desc:'Intervallo tra gli attacchi −6% a ogni grado.',apply:p=>p.rate*=.94},
 {id:'boots',rarity:'common',icon:'↗',name:'Stivali del predone',tag:'MOVIMENTO',desc:'+5% velocità di movimento a ogni grado.',apply:p=>p.speed*=1.05},
 {id:'magnet',rarity:'common',icon:'◎',name:'Tasca magnetica',tag:'RACCOLTA',desc:'+20% raggio di raccolta a ogni grado.',apply:p=>p.magnet*=1.2},
 {id:'plating',rarity:'common',icon:'▣',name:'Piastre di recupero',tag:'INTEGRITÀ',desc:'+12 integrità massima e cura di 12 a ogni grado.',apply:p=>{p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);}},
 {id:'study',rarity:'common',icon:'+',name:'Cacciatore di cristalli',tag:'ESPERIENZA',desc:'+8% esperienza dai cristalli a ogni grado.',apply:p=>p.xpBonus+=.08},
 {id:'sight',rarity:'common',icon:'⌖',name:'Mirino calibrato',tag:'CRITICO',desc:'+3 punti % di probabilità critica (massimo 90%).',apply:p=>p.crit=Math.min(.9,p.crit+.03),ok:p=>p.crit<.9},
 {id:'reach',rarity:'common',icon:'→',name:'Arsenale allungato',tag:'PORTATA',desc:'+12% velocità dei proiettili e +12 portata dell’ascia.',apply:p=>{p.projectileSpeed*=1.12;p.reach+=12;}},
 {id:'pierce',rarity:'rare',icon:'⌁',name:'Perforazione',tag:'ATTACCO',desc:'+1 perforazione; per l’ascia +18% danni, per l’obice +12 raggio esplosione.',apply:p=>{p.pierce++;if(p.hero.id==='knight')p.damage*=1.18;}},
 {id:'heart',rarity:'rare',icon:'♡',name:'Secondo cuore',tag:'INTEGRITÀ',desc:'+30 integrità massima e cura di 45 a ogni grado.',apply:p=>{p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+45);}},
 {id:'dash',rarity:'rare',icon:'»',name:'Scatto fasico',tag:'SCATTO',desc:'Ricarica dello scatto −18% a ogni grado.',apply:p=>p.dashRecovery*=.82},
 {id:'regen',rarity:'rare',icon:'✚',name:'Naniti riparatori',tag:'CURA',desc:'Rigeneri +1,5 integrità al secondo a ogni grado.',apply:p=>p.regen+=1.5},
 {id:'armor',rarity:'rare',icon:'⬡',name:'Corazza adattiva',tag:'DIFESA',desc:'Subisci il 12% di danni in meno a ogni grado.',apply:p=>p.armor=1-(1-p.armor)*.88},
 {id:'cryo',rarity:'rare',icon:'❄',name:'Munizioni criogeniche',tag:'CONTROLLO',desc:'Colpire rallenta i nemici: +18 punti % per grado, fino al 65%, per 2 s.',apply:p=>p.slow=Math.min(.65,p.slow+.18),ok:p=>p.slow<.65},
 {id:'bounty',rarity:'rare',icon:'✧',name:'Taglia di sangue',tag:'CURA',desc:'Ogni eliminazione restituisce +1 integrità per grado.',apply:p=>p.killHeal++},
 {id:'crossfire',rarity:'epic',icon:'⫷',name:'Fuoco incrociato',tag:'MULTICOLPO',desc:'+1 proiettile per raffica (massimo 9); per l’ascia +30% danni base.',apply:p=>p.shots++,ok:p=>p.shots<9},
 {id:'super',rarity:'epic',icon:'☄',name:'Reattore supernova',tag:'SUPER',desc:'Ricarica della super −25% a ogni grado.',apply:p=>p.novaRecovery*=.75},
 {id:'crit',rarity:'epic',icon:'✴',name:'Istinto del carnefice',tag:'CRITICO',desc:'+10 punti % probabilità critica e +0,5× moltiplicatore critico.',apply:p=>{p.crit=Math.min(.9,p.crit+.1);p.critPower+=.5;}},
 {id:'leech',rarity:'epic',icon:'◈',name:'Patto vampirico',tag:'FURTO VITA',desc:'Recuperi il 3% dei danni diretti inflitti in più per grado (massimo 18%).',apply:p=>p.lifesteal=Math.min(.18,p.lifesteal+.03),ok:p=>p.lifesteal<.18},
 {id:'hunter',rarity:'epic',icon:'⚑',name:'Ammazzagiganti',tag:'ANTI BOSS',desc:'+60% danni contro i boss a ogni grado.',apply:p=>p.bossDamage+=.6},
 {id:'chain',rarity:'legendary',icon:'ϟ',name:'Giudizio del cielo',tag:'FULMINI',desc:'Ogni attacco colpito fulmina +2 nemici vicini per il 65% dei danni arma.',apply:p=>p.chain+=2},
 {id:'aura',rarity:'legendary',icon:'☀',name:'Sole dell’apocalisse',tag:'AURA',desc:'Ogni secondo infliggi +100% danni arma ai nemici entro 210 passi.',apply:p=>p.aura++},
 {id:'phoenix',rarity:'legendary',icon:'★',name:'Protocollo fenice',tag:'RESURREZIONE',desc:'+1 resurrezione al 100% di integrità con 3 s di invulnerabilità.',apply:p=>p.revives++},
 {id:'execute',rarity:'legendary',icon:'✕',name:'Decreto del vuoto',tag:'ESECUZIONE',desc:'I colpi diretti eliminano sotto il 15% di vita; +10 punti % ai gradi successivi (massimo 45%; boss: metà soglia).',apply:p=>p.execute=p.execute?Math.min(.45,p.execute+.1):.15,ok:p=>p.execute<.45}
];
function rollUpgrades(){
 const pool=upgrades.filter(u=>!u.ok||u.ok(player)),options=[];
 while(options.length<3&&pool.length){
  const tiers=Object.keys(rarities).filter(r=>pool.some(u=>u.rarity===r));
  let roll=Math.random()*tiers.reduce((n,r)=>n+rarities[r].weight,0);
  const tier=tiers.find(r=>(roll-=rarities[r].weight)<0)||tiers.at(-1);
  const candidates=pool.filter(u=>u.rarity===tier);
  const weight=u=>previousOffers.includes(u.id)?.3:1;
  let pick=Math.random()*candidates.reduce((n,u)=>n+weight(u),0);
  const chosen=candidates.find(u=>(pick-=weight(u))<0)||candidates.at(-1);
  options.push(chosen);pool.splice(pool.indexOf(chosen),1);
 }
 previousOffers=options.map(u=>u.id);return options;
}
function chooseUpgrade(){
 mode='upgrade';showModal('LIVELLO '+player.level,'SCEGLI POTERE','');
 $('overlay').classList.add('upgrade-mode');$('homeButton').hidden=true;
 for(const [index,u] of rollUpgrades().entries()){
  const rank=player.ranks[u.id]||0,r=rarities[u.rarity],b=document.createElement('button');
  b.className='upgrade rarity-'+u.rarity;b.style.setProperty('--card-index',index);
  b.innerHTML='<span class="card-top"><span class="rarity-badge">'+r.stars+' '+r.name+'</span><span class="card-number">0'+(index+1)+'</span></span><span class="card-art"><span class="icon">'+u.icon+'</span></span><span class="card-tag">'+u.tag+'</span><b>'+u.name+'</b><span class="rank-label">'+(rank?'POTENZIA · GRADO '+rank+' → '+(rank+1):'NUOVA ABILITÀ · GRADO 1')+'</span><small>'+u.desc+'</small><span class="card-action">'+(rank?'POTENZIA +1':'SBLOCCA POTERE')+' <span>↗</span></span>';
  b.onclick=()=>{if(mode!=='upgrade')return;mode='play';animateHero('upgrade');u.apply(player);player.ranks[u.id]=rank+1;pendingUpgrades=Math.max(0,pendingUpgrades-1);sfx('upgrade');announce(u.name.toUpperCase()+' / GRADO '+(rank+1));if(pendingUpgrades>0)chooseUpgrade();else {$('overlay').hidden=true;releaseControlFocus();}updateHud();syncControls();};
  $('choices').append(b);
 }
 document.querySelector('.upgrade')?.focus?.({preventScroll:true});
}
function weaponHit(e,amount,critical=false){
 const dealt=Math.min(e.hp,amount*(e.type==='boss'?1+player.bossDamage:1)*(furyTime>0?1.5:1));
 damageEnemy(e,amount,critical);
 player.hp=Math.min(player.maxHp,player.hp+dealt*player.lifesteal);
 if(e.hp>0){e.slowTime=2;e.slow=player.slow;if(player.execute&&e.hp/e.maxHp<=player.execute*(e.type==='boss'?.5:1))damageEnemy(e,e.hp,true);}
 if(player.chain){let count=0;for(const other of enemies){if(other!==e&&other.hp>0&&Math.hypot(other.x-e.x,other.y-e.y)<240){damageEnemy(other,player.damage*.65);ring(other.x,other.y,'#72e3ed',35);if(++count>=player.chain)break;}}}
}
function endRun(win){if(campaignRun!==null){endMission(win);return;}mode='end';saveBest();showModal(win?'TRASMISSIONE COMPLETATA':'TRASMISSIONE INTERROTTA',win?'SEI TU L’APOCALISSE.':'IL RUMORE SI SPEGNE.',`${bossMode?'Boss infiniti · ondata '+wave+' · ':''}${score.toLocaleString('it-IT')} punti · ${kills} eliminazioni · livello ${player.level} · ${Math.floor(runTime/60)}m ${Math.floor(runTime%60)}s · combo record ${peakCombo} · ${furyCount} Furie`);$('continueButton').hidden=false;$('continueButton').textContent='RIPROVA ↗';$('continueButton').onclick=newRun;focusControl('continueButton');}
function shoot(){let target=null,dist=Infinity;for(const e of enemies){if(e.hp<=0)continue;const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<dist){dist=d;target=e;}}if(!target)return;const angle=Math.atan2(target.y-player.y,target.x-player.x);player.aim=angle;animateHero('attack');
if(player.hero.id==='knight'){player.recoil=.25;const reach=165+player.reach;ring(player.x,player.y,player.hero.color,reach);for(const e of enemies){const d=Math.hypot(e.x-player.x,e.y-player.y);if(e.hp>0&&d<reach){const critical=Math.random()<player.crit;weaponHit(e,player.damage*(1+(player.shots-1)*.3)*(critical?player.critPower:1),critical);const push=Math.atan2(e.y-player.y,e.x-player.x);if(!e.relay){e.x+=Math.cos(push)*28;e.y+=Math.sin(push)*28;}}}sfx('slash');return;}
// Keep a shot on the aim line even with an even projectile count; flank it with a tight fan.
for(let i=0;i<player.shots;i++){const offset=i===0?0:Math.ceil(i/2)*(i%2?-1:1)*.035;const a=angle+offset,speed=(player.hero.id==='bomber'?440:720)*player.projectileSpeed;bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:1.8,pierce:player.pierce,hit:new Set(),kind:player.hero.id,bounces:2});}player.recoil=.12;sfx(player.hero.id==='bomber'?'rocket':player.hero.id==='ranger'?'magic':'shoot');}
function update(dt){runTime+=dt;tickHeroAnimation(dt);
 furyTime=Math.max(0,furyTime-dt);if(furyTime<=0&&comboTime<=0)heat=Math.max(0,heat-dt*2);
 eliteTimer-=dt;if(eliteTimer<=0&&waveTime>4&&wave%4!==0&&enemies.length<250){spawn('tank');const elite=enemies[enemies.length-1];elite.elite=true;elite.hp*=2.5;elite.maxHp=elite.hp;elite.speed*=1.25;elite.r+=5;eliteTimer=13;announce('ÉLITE IN ARRIVO');}
 for(const d of drops){d.life-=dt;if(Math.hypot(d.x-player.x,d.y-player.y)<player.r+22)collectLoot(d);}drops=drops.filter(d=>d.life>0);

 if(player.hp>0)player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);
 if(player.aura){player.auraTimer-=dt;if(player.auraTimer<=0){player.auraTimer=1;ring(player.x,player.y,'#ffdb77',210);for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<210)damageEnemy(e,player.damage*player.aura);}}
waveTime=Math.max(0,waveTime-dt);comboTime-=dt;if(comboTime<=0)combo=0;player.recoil=Math.max(0,(player.recoil||0)-dt);player.inv=Math.max(0,player.inv-dt);player.dashCd=Math.max(0,player.dashCd-dt);player.novaCd=Math.max(0,player.novaCd-dt);player.dashTime=Math.max(0,player.dashTime-dt);
 let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+stick.x,my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+stick.y;const length=Math.hypot(mx,my);if(length){if(length>1){mx/=length;my/=length;}player.dx=mx/Math.hypot(mx,my);player.dy=my/Math.hypot(mx,my);}if(player.dashTime>0){mx=player.dx;my=player.dy;burst(player.x,player.y,palette.accent,3,40);}const speed=player.speed*(player.dashTime>0?4.2:1);const oldPlayerX=player.x,oldPlayerY=player.y;player.x=clamp(player.x+mx*speed*dt,20,W-20);player.y=clamp(player.y+my*speed*dt,22,H-22);player.moving=Math.hypot(player.x-oldPlayerX,player.y-oldPlayerY)>.01;followCamera(1-Math.exp(-dt*10));
 shootTimer-=dt;if(shootTimer<=0){shoot();shootTimer=player.rate*(furyTime>0?.5:1);}spawnTimer-=dt;if(spawnTimer<=0&&waveTime>0&&enemies.length<enemyLimit()-(!bossSpawned&&isBossWave()?1:0)){const pressure=assaultWave();const count=Math.min(bossMode?26:pressure?12:10,(bossMode?18:pressure?8:5)+Math.floor((wave-1)/3),enemyLimit()-enemies.length-(!bossSpawned&&isBossWave()?1:0));for(let i=0;i<count;i++){const roll=Math.random();spawn(wave>2&&roll<.14?'shooter':wave>1&&roll<.34?'tank':roll>.72?'runner':'normal');}spawnTimer=(bossMode?Math.max(.16,.3-wave*.004):pressure?Math.max(.22,.38-wave*.01):Math.max(.28,.72-wave*.035))*(waveEvent?.spawn||1);}
 if(isBossWave()&&!bossSpawned){spawn('boss');bossSpawned=true;ambush(bossMode?90:32);announce(bossNames[bossKind()]+(bossMode?' / ONDATA '+wave:''));sfx('boss');}
 for(const e of enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);const guarding=campaignRun!==null&&missions[campaignRun].kind==='defend'&&e.type!=='shooter';const dx=(guarding?W/2:player.x)-e.x,dy=(guarding?H*.55:player.y)-e.y,d=Math.hypot(dx,dy)||1;let move=e.type==='shooter'&&d<300&&waveTime>0?-.3:1;e.slowTime=Math.max(0,(e.slowTime||0)-dt);const chill=e.slowTime>0?1-(e.slow||0):1;e.x+=dx/d*e.speed*dt*move*chill*(waveEvent?.speed||1);e.y+=dy/d*e.speed*dt*move*chill*(waveEvent?.speed||1);e.angle+=dt;e.cd-=dt;if((e.type==='shooter'||e.type==='boss')&&e.cd<=0){if(e.type==='boss')bossAttack(e,Math.atan2(dy,dx));else{e.cd=2.4;const a=Math.atan2(dy,dx);enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,life:6});}}if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r){if(player.dashTime>0){if(!e.dashHit){damageEnemy(e,player.damage*3,true);e.dashHit=true;}}else if(player.inv<=0){player.hp-=(e.type==='boss'?25*(e.damageScale||1):12)*(1-player.armor);player.inv=.8;animateHero('hurt');shake=9;burst(player.x,player.y,'#bf7052',22,200);sfx('hurt');}}else e.dashHit=false;}
 for(const b of bullets){const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of enemies){if(e.hp<=0||b.hit.has(e)||b.life<=0)continue;const sx=b.x-oldX,sy=b.y-oldY,t=clamp(((e.x-oldX)*sx+(e.y-oldY)*sy)/(sx*sx+sy*sy||1),0,1);const dx=e.x-(oldX+sx*t),dy=e.y-(oldY+sy*t),radius=e.r+6;if(Math.abs(dx)<radius&&Math.abs(dy)<radius&&dx*dx+dy*dy<radius*radius){if(b.kind==='bomber'||b.kind==='ranger'){b.x=oldX+sx*t;b.y=oldY+sy*t;}b.hit.add(e);const critical=Math.random()<player.crit;weaponHit(e,player.damage*(b.power||1)*(critical?player.critPower:1),critical);if(b.kind==='bomber'){const splash=125+player.pierce*12;ring(b.x,b.y,'#f5d56e',splash);burst(b.x,b.y,'#ff9760',32,270);sfx('explosion');for(const other of enemies){if(other!==e&&other.hp>0&&Math.hypot(other.x-b.x,other.y-b.y)<splash)damageEnemy(other,player.damage*.85*(b.power||1));}b.life=0;}else if(b.kind==='ranger'&&b.bounces>0){let next=null,near=330;for(const other of enemies){const d=Math.hypot(other.x-b.x,other.y-b.y);if(other.hp>0&&!b.hit.has(other)&&d<near){next=other;near=d;}}if(next){const a=Math.atan2(next.y-b.y,next.x-b.x);b.vx=Math.cos(a)*720*player.projectileSpeed;b.vy=Math.sin(a)*720*player.projectileSpeed;b.bounces--;break;}else if(b.pierce--<=0)b.life=0;}else if(b.pierce--<=0)b.life=0;}}}
 for(const b of enemyBullets){if(b.life<=0)continue;if(player.dashTime>0&&Math.hypot(b.x-player.x,b.y-player.y)<68){b.life=0;addHeat(2);player.novaCd=Math.max(0,player.novaCd-.2);burst(b.x,b.y,'#72e3ed',5,70);sfx('parry');continue;}b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(player.inv<=0&&Math.hypot(b.x-player.x,b.y-player.y)<player.r+(b.r||5)){player.hp-=10*(b.damageScale||1)*(1-player.armor);player.inv=.6;animateHero('hurt');b.life=0;shake=7;sfx('hurt');burst(player.x,player.y,'#bf7052',12);}}
 for(const g of gems){g.age+=dt;const dx=player.x-g.x,dy=player.y-g.y,d=Math.hypot(dx,dy)||1;if(d<player.magnet){const step=Math.min(d,(350+g.age*8)*dt);g.x+=dx/d*step;g.y+=dy/d*step;}if(d<21){player.xp+=g.value*(1+player.xpBonus);g.collected=true;sfx('gem');while(player.xp>=player.nextXp){player.xp-=player.nextXp;player.level++;player.nextXp=Math.round(player.nextXp*1.23);pendingUpgrades++;}}}
 gems=gems.filter(g=>!g.collected);if(gems.length>450){const extra=gems.splice(0,gems.length-450);gems[0].value+=extra.reduce((sum,g)=>sum+g.value,0);}enemies=enemies.filter(e=>e.hp>0);bullets=bullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>0&&b.y<H+50);enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>0&&b.y<H+50);
 if(campaignRun!==null&&!missionTick(dt))return;
 if(player.hp<=0&&player.revives>0){player.revives--;player.hp=player.maxHp;player.inv=3;animateHero('spawn',true);ring(player.x,player.y,'#ffdb77',300);announce('PROTOCOLLO FENICE / RINASCITA');}if(player.hp<=0){player.hp=0;endRun(false);}else if(pendingUpgrades>0)chooseUpgrade();else if(waveTime<=0&&enemies.length===0){if(campaignRun!==null){advanceMission();}else if(!bossMode&&wave===12){endRun(true);}else{wave++;waveTime=30+Math.min(15,wave*2);bossSpawned=false;beginWave();for(const g of gems){g.x=player.x;g.y=player.y;}player.dashCd=0;player.hp=Math.min(player.maxHp,player.hp+12);if((wave-1)%4===0){palette=palettes[(arena+Math.floor((wave-1)/4))%3];$('arenaName').textContent=palette.name;}announce('ONDATA '+String(wave).padStart(2,'0'));}}updateHud(false,dt);
}
let hudElapsed=0;
function updateHud(force=true,dt=0){hudElapsed+=dt;if(!force&&hudElapsed<.1)return;hudElapsed=0;updateBossHud();$('furyFill').style.width=(furyTime>0?furyTime/7*100:heat)+'%';$('furyText').textContent=furyTime>0?'FURIA! '+furyTime.toFixed(1)+'s':'FURIA '+Math.floor(heat)+'%';$('furyMeter').setAttribute('data-active',String(furyTime>0));$('comboFill').style.width=(combo>0?clamp(comboTime/3.5,0,1)*100:0)+'%';$('healthText').textContent=Math.ceil(player.hp)+' / '+player.maxHp;$('healthBar').style.width=(player.hp/player.maxHp*100)+'%';$('xpBar').style.width=(player.xp/player.nextXp*100)+'%';$('levelText').textContent=player.level;$('waveText').textContent=campaignRun===null?'ONDATA '+String(wave).padStart(2,'0')+(bossMode?' / ∞':' / 12'):'M'+(campaignRun+1)+' / ONDATA '+wave+' DI '+missions[campaignRun].waves;$('timer').textContent='00:'+String(Math.ceil(waveTime)).padStart(2,'0');$('enemyCount').textContent=waveTime<=0?'ELIMINA I SUPERSTITI':enemies.length+' SEGNALI OSTILI';$('score').textContent=String(score).padStart(6,'0');$('combo').textContent=combo>1?combo+' COMBO / ×'+(1+Math.min(4,Math.floor(combo/10))):'';$('dashButton').style.setProperty('--charge',String(clamp(1-player.dashCd/(2.6*player.dashRecovery*(waveEvent===waveEvents[3]?.65:1)),0,1)));$('novaButton').style.setProperty('--charge',String(clamp(1-player.novaCd/(12*player.novaRecovery),0,1)));$('dashText').textContent=player.dashCd>0?player.dashCd.toFixed(1)+' s':'PRONTO';$('novaText').textContent=player.novaCd>0?player.novaCd.toFixed(1)+' s':'PRONTO';$('dashButton').disabled=mode!=='play'||player.dashCd>0;$('novaButton').disabled=mode!=='play'||player.novaCd>0;}
const bossNames=['GORATH / RE DEI PREDONI','MYCELIA / REGINA DELLE SPORE','OMEGA / CUORE DELLA FORGIA'];
function updateBossHud(){
 const boss=enemies.find(e=>e.type==='boss'&&e.hp>0);
 $('bossHud').hidden=!boss;
 if(!boss)return;
 const kind=boss.bossKind||0;
 $('bossHud').style.color=['#ff9760','#e58bbb','#82b5de'][kind];
 $('bossName').textContent=bossNames[kind]+(bossMode?' / POTENZA '+wave:'')+(boss.hp<boss.maxHp*.5?' / FURIA':'');
 $('bossHealth').style.width=(clamp(boss.hp/boss.maxHp,0,1)*100)+'%';
}
function bossAttack(e,aim){
 const kind=e.bossKind||0,furious=e.hp<e.maxHp*.5;e.phase++;if(e.phase%3===0&&waveTime>0)ambush(bossMode?(furious?48:30):(furious?20:12));e.cd=((furious?1.1:1.8)+(!bossMode&&kind===1?.25:0))/(bossMode?1+1.5*(1-Math.exp(-(wave-1)/20)):1);
 const emit=(a,speed,r,color)=>{const pace=bossMode?1+.45*(1-Math.exp(-(wave-1)/20)):1;enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed*pace,vy:Math.sin(a)*speed*pace,life:6,r,color,damageScale:e.damageScale||1});};
 if(kind===0){const count=furious?7:5;for(let i=0;i<count;i++)emit(aim+(i-(count-1)/2)*.24,210,7,'#ff9e59');if(furious&&e.phase%2===0)ring(e.x,e.y,'#ff9e59',140);}
 else if(kind===1){const count=furious?18:12;for(let i=0;i<count;i++)emit(TAU*i/count+e.phase*.27,furious?145:115,8,'#d58aff');}
 else{const count=furious?20:14;for(let i=0;i<count;i++)emit(TAU*i/count+e.phase*.19,195,6,'#ff6e80');for(let i=-1;i<=1;i++)emit(aim+i*.15,280,5,'#ffdb7c');}
 burst(e.x,e.y,['#ffbd68','#d58aff','#ff6e80'][kind],12,100);
}
// Original pixel sprites: each character is one source pixel.
const spriteMaps={
 gunslinger:["......00000......",".....0233320.....",".....0233320.....",".....0244420.....","......02220......",".......050.......","..0000022200000..",".0233202662023320",".0232202442022320","..0220266620220..","...00026662000...","......02220......",".....0222220.....",".....0200020.....",".....030.030.....",".....020.020.....","....0230.0320....","....0000.0000...."],
 knight:["...55.......55...","...055.....550...","....055000550....",".....0233320.....","....023233220....","....024244220....","....022222220....",".....0255520.....","..0000222220000..",".0233202662023320",".0232202552022320","..0200266620020..","...00026662000...","......02220......",".....0220220.....","....0220.0220....","....0250.0520....","...05550.05550...","...00000.00000..."],
 bomber:[".......050.......",".......050.......",".....0022200.....","....023333320....","....024444420....","..0002222222000..",".023326666623320.",".023226446622320.",".022226666622220.","..0002222220000..",".000002222200000.","02332022222023320","02222022222022220","02332000000023320","022220.....022220","023320.....023320",".0000.......0000."],
 ranger:["........5........",".......050.......","......02320......",".....0233320.....","....023333320....","....023000320....","....020444020....","....023000320....",".....0222220.....","..0000222220000..",".0232026662023320","..0200264620020..","...00026662000...",".....0222220.....","....023223220....","....022222220....","...02322022320...","...02220.02220...","....020...020....",".....0.....0....."]
};
// Forearms are drawn separately so they can follow the weapon in every direction.
const bodyMaps=Object.fromEntries(Object.entries(spriteMaps).map(([id,rows])=>[id,rows.map((row,r)=>{
 const detached=id==='gunslinger'?r>=9&&r<=11:id==='knight'?r>=11&&r<=12:id==='ranger'?r>=11&&r<=12:false;
 return detached?[...row].map((pixel,c)=>c<6||c>10?'.':pixel).join(''):row;
})]));
// Discrete pixel-art cels, built once from the original character drawings.
// Each pose has its own image; rendering never stretches or interpolates pixels.
const heroClips={idle:{fps:5,count:6,loop:true},walk:{fps:12,count:8,loop:true},attack:{fps:24,count:6},dash:{fps:30,count:6},super:{fps:16,count:10},hurt:{fps:16,count:4},spawn:{fps:12,count:8},heal:{fps:12,count:6},upgrade:{fps:12,count:8},fury:{fps:14,count:8,loop:true}};
function makeHeroCel(id,state,f){
 const source=bodyMaps[id],w=25,h=28,cx=4,cy=14-Math.floor(source.length/2);
 const pixels=Array.from({length:h},()=>Array(w).fill('.'));
 const cycle=[0,1,2,1,0,-1,-2,-1],step=cycle[f%8];
 const legs=id==='gunslinger'?13:id==='knight'?14:id==='bomber'?11:14;
 let lift=0,lean=0,squat=0;
 if(state==='idle')lift=f===2||f===3?-1:0;
 if(state==='walk'){lift=f%4===1?-1:0;lean=step>0?1:0;}
 if(state==='attack'){lean=[0,-1,-2,-1,1,0][f];squat=f===2?1:0;}
 if(state==='dash'){lean=[0,1,2,3,2,1][f];squat=2;}
 if(state==='super'){lift=[0,1,1,0,-1,-2,-2,-1,0,0][f];lean=f<3?-1:0;}
 if(state==='hurt'){lean=[-2,-2,-1,0][f];squat=f<2?1:0;}
 if(state==='spawn')squat=[4,3,2,1,0,-1,0,0][f];
 if(state==='heal'||state==='upgrade')lift=[0,-1,-2,-2,-1,0,0,0][f];
 if(state==='fury'){lift=f%4===1?-1:0;lean=step>0?1:-1;}
 const put=(x,y,p)=>{if(x>=0&&x<w&&y>=0&&y<h)pixels[y][x]=p;};
 for(let y=0;y<source.length;y++)for(let x=0;x<source[y].length;x++){
  let color=source[y][x];if(color==='.')continue;
  let px=x+cx,py=y+cy;
  if(y<legs){px+=lean;py+=lift+squat;}
  else if(state==='walk'||state==='fury'){
   if(id==='bomber'){
    // Alternating tread teeth instead of walking legs on the tracked mech.
    if(color==='3'||color==='2')color=(y+f+(x<8?0:2))%3===0?'3':'2';
   }else{const stride=x<8?step:-step;px+=Math.sign(stride);py+=Math.round(stride/2);}
  }else if(state==='dash'){px-=Math.round((y-legs)/2);py-=x<8?1:0;}
  else if(state==='spawn'){py+=Math.round(squat/2);}
  if(id==='ranger'&&y>=14){px+=cycle[(f+y)%8]>0?1:-1;}
  // Blink in the idle sequence and light the reactor during power-up cels.
  if(state==='idle'&&f===4&&color==='4'&&y<9)color='2';
  if(['super','upgrade','heal','fury'].includes(state)&&color==='6'&&(x+y+f)%3===0)color='4';
  put(px,py,color);
 }
 // Pixel trails and motes belong to the cel, not to a particle simulation.
 if(state==='dash')for(let i=0;i<3;i++){put(cx-1-i,cy+7+i*3,'3');put(cx-i,cy+7+i*3,'4');}
 if(['super','heal','upgrade','spawn'].includes(state))for(let i=0;i<4;i++){
  const x=2+(i*7+f*3)%21,y=3+(i*5+18-f*2+28)%23;
  put(x,y,state==='heal'?'7':'3');if(f%2===0)put(x,y-1,'4');
 }
 return pixels.map(row=>row.join(''));
}
const heroFrames=Object.fromEntries(Object.keys(bodyMaps).map(id=>[id,Object.fromEntries(Object.entries(heroClips).map(([state,clip])=>[state,Array.from({length:clip.count},(_,f)=>makeHeroCel(id,state,f))]))]));
const heroAnimPriority={attack:1,heal:2,upgrade:3,spawn:4,hurt:5,super:6,dash:7};
function animateHero(state,force=false){
 if(!player)return;
 const current=player.animation;
 if(!force&&current&&current.elapsed<heroClips[current.state].count/heroClips[current.state].fps&&(heroAnimPriority[current.state]||0)>(heroAnimPriority[state]||0))return;
 player.animation={state,elapsed:0};
}
function tickHeroAnimation(dt){
 player.animClock=(player.animClock||0)+dt;
 if(player.animation){player.animation.elapsed+=dt;const clip=heroClips[player.animation.state];if(player.animation.elapsed>=clip.count/clip.fps)player.animation=null;}
}
function heroPose(h,live=false){
 const animation=live?player.animation:null;
 const state=animation?animation.state:live&&player.moving?'walk':live&&furyTime>0?'fury':'idle';
 const clip=heroClips[state],clock=animation?animation.elapsed:live?(player.animClock||0):time;
 const frame=clip.loop?Math.floor(clock*clip.fps)%clip.count:Math.min(clip.count-1,Math.floor(clock*clip.fps));
 return {state,frame,rows:heroFrames[h.id][state][frame]};
}
const enemyMaps={"normal":["..5......5..","..05000050..","..02333220..","..02424420..","...022220...",".0002552000.","023226622320",".0202662020.","..00222200..","...020020...","..02300320..","..00000000.."],"runner":[".....55.....","....0550....","...023320...","...024420...","....0220....","..00266200..",".0322662230.","..00222200..","...020020...","..0320.0320.",".0000...000."],"tank":["..00000000..",".0233333320.","023222222320","022442244220","022222222220",".0025522000.","023266662320","023264462320","022266662220",".002222200..","..02200220..",".0255005520.",".0000000000."],"shooter":["....5555....","..55222255..",".5223333225.","522333333225","055555555550","..02444420..","...022220...",".0002662000.","023226622320","..00266200..","...022220...","..02300320..","..00000000.."]};
// Rasterize each sprite/palette once, then draw a single nearest-neighbour image.
const spriteCache=new WeakMap();
const gemSprite=['..3..','.343.','34443','.343.','..3..'];
function sprite(rows,x,y,pixel,colors,flip=false){
 const width=rows[0].length;pixel=Math.max(1,Math.round(pixel));
 const left=Math.round(x/pixel)*pixel-Math.floor(width/2)*pixel;
 const top=Math.round(y/pixel)*pixel-Math.floor(rows.length/2)*pixel;
 let variants=spriteCache.get(rows);
 if(!variants){variants=new Map();spriteCache.set(rows,variants);}
 const key=Object.values(colors).join('|')+':'+flip;
 let image=variants.get(key);
 if(!image){
  image=document.createElement('canvas');image.width=width;image.height=rows.length;
  const raster=image.getContext('2d');
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
   const color=colors[rows[r][c]];if(!color)continue;
   raster.fillStyle=color;raster.fillRect(flip?width-1-c:c,r,1,1);
  }
  variants.set(key,image);
 }
 ctx.drawImage(image,left,top,width*pixel,rows.length*pixel);
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
const ringPoints=Array.from({length:32},(_,i)=>[Math.cos(TAU*i/32),Math.sin(TAU*i/32)]);
function pixelRing(x,y,r,color){ctx.fillStyle=color;for(const [dx,dy] of ringPoints)ctx.fillRect(Math.round((x+dx*r)/3)*3,Math.round((y+dy*r)/3)*3,4,4);}
function drawPlayer(x,y,scale=1,angle=0,h=heroes[selectedHero],aim=0){
 const p=Math.max(3,Math.round(scale)*3);
 const live=!!(player&&player.hero===h&&mode!=='menu'&&mode!=='map'&&mode!=='comic');
 const pose=heroPose(h,live),bob=0;
 const colors={'0':'#101426','2':h.coat,'3':h.color,'4':'#f8f4c4','5':h.id==='knight'?'#ffc15a':h.color,'6':h.id==='gunslinger'?'#496d96':h.id==='knight'?'#ac4e47':h.id==='bomber'?'#6f8191':'#765baf','7':'#80e6a0'};
 rect(x-9*p,y+10*p,18*p,2*p,'#111426');
 const side=Math.cos(aim)<0?-1:1;
 sprite(pose.rows,x,y+bob,p,colors,side<0);
 ctx.save();
 const action=pose.state==='attack',phase=pose.frame/(heroClips[pose.state].count-1);
 const armLift=pose.state==='super'?-2*p:pose.state==='spawn'?p:pose.state==='walk'?(pose.frame%4===1?-p:0):0;
 ctx.translate(x,y+bob+armLift);
 const swing=h.id==='knight'&&action?[-.7,-1,-.3,.6,.35,0][pose.frame]*side:0;
 ctx.rotate(aim+swing);
 ctx.scale(1,side);
 const recoil=action?[0,1,2,1,.5,0][pose.frame]*p:0;
 const wx=9*p-recoil,wy=0;
 for(const s of [-1,1]){
  const armY=s*3*p;
  rect(2*p,armY-p,7*p-recoil,3*p,colors['0']);
  rect(3*p,armY,5*p-recoil,p,h.coat);
  rect(wx-p,armY,2*p,2*p,h.color);
 }
 if(h.id==='gunslinger')for(const s of [-1,1]){rect(wx-2*p,wy+s*4*p,7*p,3*p,'#101426');rect(wx-p,wy+s*4*p,5*p,p,h.color);rect(wx+3*p,wy+s*4*p,p,2*p,'#f8f4c4');}
 if(h.id==='knight'){rect(wx,wy-11*p,2*p,23*p,'#ffc15a');rect(wx-4*p,wy-11*p,10*p,6*p,'#101426');rect(wx-3*p,wy-10*p,8*p,4*p,'#e3edf2');rect(wx-5*p,wy-9*p,2*p,3*p,'#ff8958');rect(wx+5*p,wy-9*p,2*p,3*p,'#ff8958');}
 if(h.id==='bomber'){rect(wx-4*p,wy-4*p,10*p,5*p,'#101426');rect(wx-3*p,wy-3*p,8*p,2*p,'#a0b1c1');rect(wx+4*p,wy-3*p,2*p,3*p,'#ffc15a');}
 if(h.id==='ranger'){ctx.save();ctx.translate(wx,wy);ctx.rotate((action?phase*TAU:pose.frame*Math.PI/6));pixelRing(0,0,4*p,h.color);rect(-p,-5*p,p*2,p*2,'#fff4dc');rect(-5*p,-p,p*2,p*2,'#fff4dc');ctx.restore();}
 if(action&&pose.frame>=1&&pose.frame<=2&&h.id!=='knight'&&h.id!=='ranger'){for(const sy of (h.id==='gunslinger'?[-4,4]:[-2])){rect(wx+6*p,sy*p,3*p,p,'#fff4dc');rect(wx+7*p,(sy-1)*p,p,3*p,h.color);}}
 ctx.restore();
}
let tileCache=null,tileKey='';
function background(){
 const biome=palettes.indexOf(palette),key=W+':'+H+':'+biome;
 if(tileKey!==key){
  tileKey=key;const original=ctx;tileCache=document.createElement('canvas');tileCache.width=Math.ceil(W/3);tileCache.height=Math.ceil(H/3);ctx=tileCache.getContext('2d');
  const w=tileCache.width,h=tileCache.height;
  const ground=[['#352b46','#3c304d','#493450','#76516a'],['#132e38','#183940','#20454a','#39695b'],['#20273c','#282f47','#323d55','#5d6d83']][biome];
  rect(0,0,w,h,ground[0]);
  for(let y=24;y<h;y+=16)for(let x=0;x<w;x+=16){
   const seed=(x*73+y*37)%101;rect(x+1,y+1,15,15,seed%3?ground[0]:ground[1]);
   if(biome===2){rect(x,y,16,1,ground[2]);rect(x,y,1,16,ground[2]);rect(x+2,y+2,1,1,ground[3]);}
   else{rect(x+seed%11,y+seed%9,2,1,ground[2]);if(seed%4===0)rect(x+3,y+12,4,1,ground[1]);}
  }
  // Chunky tile borders; decorations never collide with the player.
  for(let y=28;y<h;y+=12)for(const x of [3,w-9]){rect(x,y,6,10,ground[2]);rect(x,y,6,2,ground[3]);}
  for(let i=0;i<22;i++){
   const x=15+(i*127)%Math.max(1,w-32),y=40+(i*83)%Math.max(1,h-65);
   if(biome===0){rect(x-4,y+4,14,3,'#211f35');rect(x-3,y-4,12,9,'#84556d');rect(x,y-7,6,3,'#bb777e');rect(x-3,y-4,4,7,'#bb777e');rect(x+1,y-3,7,1,'#e1a08b');if(i%3===0){rect(x+12,y-7,2,12,'#5f877a');rect(x+9,y-4,8,2,'#5f877a');rect(x+16,y-7,2,4,'#5f877a');}}
   else if(biome===1){rect(x-4,y+7,14,2,'#0c242f');rect(x+1,y-1,3,9,'#a9d9a3');rect(x-5,y-4,15,4,'#ad5ca5');rect(x-3,y-7,11,3,'#e58bbb');rect(x,y-9,5,2,'#e58bbb');rect(x-2,y-5,2,2,'#fff0c4');rect(x+5,y-4,2,2,'#fff0c4');rect(x+12,y+4,1,4,'#62a67c');rect(x+11,y+3,3,1,'#62a67c');}
   else{rect(x-5,y-5,13,13,'#111a2e');rect(x-4,y-4,11,3,'#72839a');rect(x-4,y-1,11,8,'#3c4d65');for(let n=0;n<3;n++)rect(x-2+n*3,y,1,5,'#ffac69');}
  }
  if(biome===2)for(const x of [1,w-5])for(let y=32;y<h-4;y+=8){rect(x,y,3,6,'#c26048');rect(x+1,y,1,6,'#ffdc80');}
  ctx=original;
 }
 ctx.imageSmoothingEnabled=false;ctx.drawImage(tileCache,0,0,tileCache.width*3,tileCache.height*3);
}
function drawMenu(){
 if(viewW<851)return;
 const x=Math.round(viewW*.79/3)*3,y=Math.round(viewH*.44/3)*3;
 const s=Math.max(2,Math.min(4,Math.floor(viewH/230)));
 rect(x-126,y+116,252,12,'#101426');rect(x-114,y+104,228,12,'#555177');rect(x-102,y+98,204,6,palette.accent);
 pixelRing(x,y,150,palette.grid);
 drawPlayer(x,y,3,0,heroes[selectedHero],0);
 textCtx.textAlign='center';textCtx.fillStyle=heroes[selectedHero].color;textCtx.font='30px "Arcade Pixel", monospace';textCtx.fillText(heroes[selectedHero].name,x,y+169);
 textCtx.font='20px "Arcade Pixel", monospace';textCtx.fillStyle='#d8dce8';textCtx.fillText(heroes[selectedHero].role.toUpperCase(),x,y+198);
 textCtx.fillStyle='#ffdb77';textCtx.fillText('PLAYER 0'+(selectedHero+1)+' / READY',x,y-184);
 textCtx.fillStyle='#b6c6dd';textCtx.fillText('HP '+heroes[selectedHero].hp+'   ATK '+heroes[selectedHero].damage+'   SPD '+heroes[selectedHero].speed,x,y+225);
 textCtx.textAlign='left';
}
function drawEnemy(e){
 if(e.elite){pixelRing(e.x,e.y,e.r+13+Math.sin(time*5)*3,'#ffcd65');rect(e.x-12,e.y-e.r-18,24,5,'#ffcd65');}
 const boss=e.type==='boss',kind=e.bossKind||0,p=boss?7:e.type==='tank'?4:3;
 const base=boss?['#b85b48','#794879','#4a6589'][kind]:e.type==='runner'?'#a37942':e.type==='tank'?'#4a6589':e.type==='shooter'?'#794879':'#a44968';
 const bright=boss?['#ff9760','#e58bbb','#82b5de'][kind]:e.type==='runner'?'#ffd477':e.type==='tank'?'#82b5de':e.type==='shooter'?'#e58bbb':'#f5879b';
 const colors={'0':'#101426','2':e.hit>0?'#fff4dc':base,'3':bright,'4':'#fff0c4','5':'#ffd477','6':'#35415e'};
 rect(e.x-6*p,e.y+6*p,12*p,2*p,'#111426');
 const rows=boss?(kind===1?enemyMaps.shooter:kind===2?enemyMaps.tank:enemyMaps.normal):enemyMaps[e.type]||enemyMaps.normal;
 sprite(rows,e.x,e.y+(Math.floor(time*7+e.angle)%2)*p,p,colors);
 if(boss&&kind===2){rect(e.x-60,e.y-20,15,50,'#101426');rect(e.x+45,e.y-20,15,50,'#101426');rect(e.x-57,e.y-24,9,22,bright);rect(e.x+48,e.y-24,9,22,bright);}
 if(!boss&&e.hp<e.maxHp){rect(e.x-18,e.y-9*p,36,3,'#101426');rect(e.x-18,e.y-9*p,36*clamp(e.hp/e.maxHp,0,1),3,bright);}
}
function paintPortraits(){
 const original=ctx;document.querySelectorAll('.hero-card canvas').forEach((c,i)=>{
  c.width=312;c.height=240;ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.scale(3,3);
  drawPlayer(48,40,1,0,heroes[i],0);
 });ctx=original;
}
paintPortraits();
function draw(){
 ctx.clearRect(0,0,viewW,viewH);textCtx.clearRect(0,0,viewW,viewH);textCtx.save();
 ctx.save();ctx.imageSmoothingEnabled=false;if(preferences.shake&&shake>0){const sx=Math.round(rand(-shake,shake)/3)*3,sy=Math.round(rand(-shake,shake)/3)*3;ctx.translate(sx,sy);textCtx.translate(sx,sy);}
 if(mode==='menu'||mode==='map'||mode==='comic'||!player){background();if(mode==='menu')drawMenu();ctx.restore();textCtx.restore();return;}
 ctx.scale(zoom,zoom);textCtx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);textCtx.translate(-camera.x,-camera.y);background();
 for(const d of drops){const colors={heal:'#66ffcf',magnet:'#72e3ed',overdrive:'#ffcd65'},color=colors[d.kind];if(d.life<3&&Math.floor(time*8)%2)continue;const bob=Math.sin(time*5)*4;pixelRing(d.x,d.y+bob,20,color);rect(d.x-12,d.y-12+bob,24,24,'#101426');textCtx.fillStyle=color;textCtx.font='18px "Arcade Pixel", monospace';textCtx.textAlign='center';textCtx.fillText({heal:'+',magnet:'M',overdrive:'F'}[d.kind],d.x,d.y+7+bob);textCtx.textAlign='left';}
 if(furyTime>0)pixelRing(player.x,player.y,40+Math.sin(time*14)*5,'#ffcd65');
 for(const g of gems){if(visible(g.x,g.y))sprite(gemSprite,g.x,g.y,2,{'3':palette.accent,'4':'#fff4dc'});}
 for(const e of enemies)if(visible(e.x,e.y))drawEnemy(e);drawMission();
 for(const b of bullets){
  const color=b.kind==='bomber'?'#ffb566':b.kind==='ranger'?'#c7a0fa':'#72e3ed';
  if(b.kind==='ranger')pixelRing(b.x,b.y,b.power?14:8,color);
  else{const a=Math.atan2(b.vy,b.vx);for(let i=0;i<6;i++)rect(Math.round((b.x-Math.cos(a)*i*4)/3)*3,Math.round((b.y-Math.sin(a)*i*4)/3)*3,b.power?6:3,b.power?6:3,i<2?'#fff4dc':color);}
 }
 for(const b of enemyBullets){const r=b.r||5;rect(b.x-r,b.y-r,r*2,r*2,b.color||'#f5879b');rect(b.x-2,b.y-2,4,4,'#fff4dc');}
 if(player.inv<=0||Math.floor(time*20)%2===0)drawPlayer(player.x,player.y,1.35,0,player.hero,player.aim);
 if(player.dashTime>0)pixelRing(player.x,player.y,32,player.hero.color);
 for(const p of particles){rect(Math.round(p.x/3)*3,Math.round(p.y/3)*3,3+Math.round(p.size/3)*3,3+Math.round(p.size/3)*3,p.color);}
 for(const r of rings)pixelRing(r.x,r.y,r.r,r.color);
 for(const l of labels){textCtx.font=(l.big?'20':'10')+'px "Arcade Pixel", monospace';textCtx.fillStyle=l.color;const x=Math.round(l.x),y=Math.round(l.y);textCtx.strokeStyle='#101426';textCtx.lineWidth=2;textCtx.strokeText(l.text,x,y);textCtx.fillText(l.text,x,y);}
 ctx.restore();textCtx.restore();drawNavigator();
}

function frame(now){const dt=Math.min(.033,(now-last)/1000||.016);last=now;time+=dt;if(mode==='play'){update(dt);shake=Math.max(0,shake-dt*32);announceTime-=dt;$('announcement').style.opacity=clamp(announceTime,0,1);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const r of rings){r.life-=dt;r.r+=(r.max-r.r)*dt*8;}rings=rings.filter(r=>r.life>0);for(const l of labels){l.y-=dt*45;l.life-=dt;}labels=labels.filter(l=>l.life>0);}draw();requestAnimationFrame(frame);}
startMenuMusic();
requestAnimationFrame(frame);
})();
