'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game');
// Text keeps the screen resolution; only the world uses the 3x pixel grid.
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
function selectHero(index){selectedHero=index;document.querySelectorAll('.hero-card').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));const h=heroes[index];$('heroDetails').textContent=h.weapon+' — '+h.detail;}
heroes.forEach((h,i)=>{const b=document.createElement('button');b.className='hero-card';b.setAttribute('aria-label',h.name+', '+h.role+', '+h.weapon);b.innerHTML='<canvas width="260" height="164" aria-hidden="true"></canvas><b>'+h.name+'</b><small>'+h.weapon+'</small>';b.onclick=()=>selectHero(i);$('roster').append(b);});
selectHero(0);

let W=innerWidth,H=innerHeight,dpr=1, mode='menu', palette=palettes[0], keys={}, last=0, time=0;
let player, enemies=[], bullets=[], gems=[], particles=[], rings=[], labels=[], enemyBullets=[];
let wave=1, waveTime=30, spawnTimer=0, shootTimer=0, score=0, kills=0, combo=0, comboTime=0, shake=0;
let announceTime=0, pendingUpgrades=0, resumeMode='play', best=0, arena=0, runTime=0, bossSpawned=false;
try {best=Number(localStorage.getItem('neon-requiem-best'))||0;} catch {}
$('best').textContent=String(best).padStart(6,'0');
function resize(){W=innerWidth;H=innerHeight;dpr=1/3;canvas.width=Math.ceil(W/3);canvas.height=Math.ceil(H/3);canvas.style.width=(canvas.width*3)+'px';canvas.style.height=(canvas.height*3)+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;const textDpr=window.devicePixelRatio||1;textCanvas.width=Math.ceil(W*textDpr);textCanvas.height=Math.ceil(H*textDpr);textCanvas.style.width=W+'px';textCanvas.style.height=H+'px';textCtx.setTransform(textDpr,0,0,textDpr,0,0);if(player){player.x=clamp(player.x,25,W-25);player.y=clamp(player.y,100,H-25);}}
addEventListener('resize',resize);resize();

// Selected, attributed playlist; generated tones remain available for effects.
const music={ctx:null,master:null,bus:null,recording:null,gap:null,playlistActive:false,playlistIndex:0,nextPlaylistStart:0,enabled:true,timer:null,step:0,next:0,track:0};
function initAudio(){if(!music.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;music.ctx=new AC();music.master=music.ctx.createGain();music.master.gain.value=.42;music.master.connect(music.ctx.destination);music.bus=music.ctx.createGain();music.bus.gain.value=.65;music.bus.connect(music.master);}music.ctx.resume().catch(()=>{});if(!music.recording){music.recording=document.createElement('audio');music.recording.loop=false;music.recording.addEventListener('ended',()=>{if(!music.playlistActive)return;music.gap=setTimeout(()=>{music.gap=null;if(music.playlistActive)playPlaylistTrack((music.playlistIndex+1)%battlePlaylist.length);},2500);});music.recording.volume=.42;music.recording.muted=!music.enabled;}}
function tone(freq,duration,kind='sine',volume=.1,at,slide){if(!music.ctx)return;const c=music.ctx,t=at??c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=kind;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(music.bus);o.start(t);o.stop(t+duration+.02);}
function noise(at,vol=.05,duration=.07){if(!music.ctx)return;const c=music.ctx,b=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=b;f.type='highpass';f.frequency.value=6500;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(music.bus);s.start(at);}
// Local CC0 recordings; bounded voice pools work even when opened with file://.
const samplePools={},sampleLast={};
const sampleDefs={shoot:['laserSmall_000',.20],rocket:['laserLarge_000',.32],blade:['laserRetro_003',.20],hit:['impactMetal_000',.24],dash:['forceField_000',.22],nova:['lowFrequency_explosion_000',.55],explosion:['explosionCrunch_000',.34],boss:['forceField_004',.45],gem:['laserRetro_001',.08],upgrade:['forceField_002',.30]};
function stopSamples(){for(const pool of Object.values(samplePools))for(const a of pool){a.pause();a.currentTime=0;}}
function sfx(type){
 if(!music.enabled)return;const def=sampleDefs[type];if(!def||typeof Audio==='undefined'){synthSfx(type);return;}
 const now=Date.now();if(now-(sampleLast[type]||0)<(type==='gem'?90:type==='hit'?65:35))return;sampleLast[type]=now;
 const pool=samplePools[type]||(samplePools[type]=Array.from({length:type==='shoot'?6:3},()=>{const a=new Audio('assets/audio/kenney/Audio/'+def[0]+'.ogg');a.preload='auto';return a;}));
 const a=pool.find(a=>a.paused||a.ended);if(!a)return;a.currentTime=0;a.volume=def[1];a.muted=!music.enabled;a.playbackRate=type==='upgrade'||type==='boss'?1:rand(.93,1.07);a.play().catch(()=>synthSfx(type==='rocket'||type==='blade'?'shoot':type));
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
function synthSfx(type){if(!music.enabled||!music.ctx)return;if(type==='shoot')tone(650,.045,'triangle',.025,undefined,280);if(type==='hit')tone(120,.08,'sawtooth',.045,undefined,35);if(type==='dash')tone(200,.15,'sawtooth',.07,undefined,900);if(type==='nova'){tone(90,.65,'sawtooth',.16,undefined,25);tone(600,.6,'sine',.1,undefined,50);}if(type==='gem')tone(850+Math.random()*300,.07,'sine',.025);if(type==='upgrade'){[440,550,660,880].forEach((f,i)=>tone(f,.25,'triangle',.12,music.ctx.currentTime+i*.08));}}
$('muteButton').onclick=()=>{initAudio();music.enabled=!music.enabled;for(const pool of Object.values(samplePools))for(const audio of pool)audio.muted=!music.enabled;if(music.recording)music.recording.muted=!music.enabled;if(music.master)music.master.gain.value=music.enabled?.42:0;$('muteButton').textContent=music.enabled?'♪ ON':'♪ OFF';if(music.enabled&&mode==='menu'&&music.recording.paused)startMenuMusic();};
$('arenaSelect').onchange=()=>palette=palettes[+$('arenaSelect').value];
function burst(x,y,color,count=15,force=150){for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(force*.2,force);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.65),max:.65,color,size:rand(1.5,4)});}if(particles.length>1100)particles.splice(0,particles.length-1100);}
function ring(x,y,color,r=100){rings.push({x,y,color,r:0,max:r,life:.45});}
function announce(text){$('announcement').textContent=text;announceTime=2;}
function newRun(){initAudio();startMusic(true);arena=+$('arenaSelect').value;palette=palettes[arena];const hero=heroes[selectedHero];previousOffers=[];player={ranks:{},regen:0,armor:0,xpBonus:0,critPower:3,projectileSpeed:1,reach:0,dashRecovery:1,novaRecovery:1,slow:0,lifesteal:0,chain:0,aura:0,auraTimer:0,execute:0,revives:0,bossDamage:0,killHeal:0,hero,aim:0,x:W/2,y:H/2,r:19,hp:hero.hp,maxHp:hero.hp,speed:hero.speed,damage:hero.damage,rate:hero.rate,shots:hero.shots,pierce:hero.pierce,crit:.1,magnet:115,level:1,xp:0,nextXp:12,dashCd:0,novaCd:0,dashTime:0,inv:1,dx:1,dy:0};enemies=[];bullets=[];enemyBullets=[];gems=[];particles=[];rings=[];labels=[];wave=1;waveTime=30;score=kills=combo=comboTime=runTime=shootTimer=spawnTimer=pendingUpgrades=0;bossSpawned=false;mode='play';$('menu').hidden=true;$('hud').hidden=false;$('overlay').hidden=true;$('arenaName').textContent=palette.name+' / '+hero.name;document.querySelector('.abilities>button:last-child span').textContent=hero.super;announce(hero.name+' / ONDATA 01');updateHud();}
$('startButton').onclick=newRun;
$('creditsButton').onclick=()=>{keys={};$('creditsDialog').showModal();};
$('closeCreditsButton').onclick=()=>{$('creditsDialog').close();$('creditsButton').focus();};
function saveBest(){if(score>best){best=score;try{localStorage.setItem('neon-requiem-best',String(best));}catch{}$('best').textContent=String(best).padStart(6,'0');}}
function showModal(eyebrow,title,description){$('overlay').classList.remove('upgrade-mode');$('overlay').hidden=false;$('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;$('modalDescription').textContent=description;$('choices').replaceChildren();$('continueButton').hidden=true;$('homeButton').hidden=false;}
function home(){stopSamples();saveBest();mode='menu';startMenuMusic();$('overlay').hidden=true;$('hud').hidden=true;$('menu').hidden=false;keys={};}
$('homeButton').onclick=home;
function pause(){if(mode==='play'){mode='pause';showModal('SEGNALE SOSPESO','RESPIRA.','L’arena ti aspetta. Riprendi la battaglia quando sei pronto.');$('continueButton').hidden=false;$('continueButton').onclick=()=>{mode='play';$('overlay').hidden=true;};}else if(mode==='pause'){$('overlay').hidden=true;mode='play';}}
$('pauseButton').onclick=pause;
$('dashButton').onclick=()=>{if(mode==='play')dash();};
$('novaButton').onclick=()=>{if(mode==='play')nova();};
addEventListener('keydown',e=>{if($('creditsDialog').open)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&e.target.tagName!=='SELECT')e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape')pause();if(mode==='play'&&e.code==='Space')dash();if(mode==='play'&&e.code==='KeyE')nova();});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};if(mode==='play')pause();});
function dash(){if(player.dashCd>0)return;player.dashCd=2.6*player.dashRecovery;player.dashTime=.19;player.inv=.35;ring(player.x,player.y,palette.accent,75);sfx('dash');}
function nova(){if(player.novaCd>0)return;player.novaCd=12*player.novaRecovery;player.inv=.7;shake=12;const h=player.hero;const radius=h.id==='knight'?330:h.id==='bomber'?440:360;ring(player.x,player.y,h.color,radius);burst(player.x,player.y,h.color,75,550);if(h.id==='gunslinger'||h.id==='ranger'){for(let i=0;i<32;i++){const a=TAU*i/32;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:1.8,pierce:2,hit:new Set(),kind:h.id,bounces:5,power:2.5});}}else{enemies.slice().forEach(e=>{const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<radius){damageEnemy(e,player.damage*(h.id==='knight'?9:7),true);if(h.id==='knight'){const a=Math.atan2(e.y-player.y,e.x-player.x);e.x+=Math.cos(a)*100;e.y+=Math.sin(a)*100;}}});}if(h.id==='bomber'){for(let i=0;i<12;i++){const a=i*TAU/12;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*440,vy:Math.sin(a)*440,life:2.5,pierce:0,hit:new Set(),kind:'bomber',power:2});}}if(h.id==='knight'){for(let i=1;i<5;i++)ring(player.x,player.y,i%2?h.color:'#ffe0b0',radius*i/4);}enemyBullets=enemyBullets.filter(b=>Math.hypot(b.x-player.x,b.y-player.y)>radius);announce(h.super);sfx('nova');}
function spawn(type){const side=Math.floor(rand(0,4));let x=side===0?-35:side===1?W+35:rand(0,W),y=side===2?65:side===3?H+35:rand(90,H);const boss=type==='boss';const hp=boss?650+wave*130:(type==='tank'?75:type==='shooter'?38:25)*(1+wave*.19);enemies.push({x,y,type,hp,maxHp:hp,bossKind:Math.max(0,Math.floor(wave/4)-1),phase:0,r:boss?62:type==='tank'?27:type==='runner'?15:20,speed:boss?43:type==='runner'?140+wave*3:type==='tank'?48:65+wave*3,cd:rand(1,3),hit:0,angle:rand(0,TAU),dashHit:false});}
function damageEnemy(e,amount,critical=false){if(e.hp<=0)return;amount*=e.type==='boss'?1+player.bossDamage:1;e.hp-=amount;e.hit=.1;if(Math.random()<.45||critical)labels.push({x:e.x+rand(-8,8),y:e.y-15,text:Math.round(amount),life:.6,color:critical?'#e9bd70':'#f6e9ce',big:critical});burst(e.x,e.y,palette.accent,3,70);if(e.hp<=0){player.hp=Math.min(player.maxHp,player.hp+player.killHeal);kills++;combo++;comboTime=2.7;const mult=1+Math.min(4,Math.floor(combo/10));score+=Math.round((e.type==='boss'?1500:30)*mult);burst(e.x,e.y,e.type==='boss'?'#e9bd70':palette.enemy,e.type==='boss'?100:17,e.type==='boss'?400:160);ring(e.x,e.y,palette.enemy,e.type==='boss'?250:42);const value=e.type==='boss'?35:e.type==='tank'?4:2;gems.push({x:e.x,y:e.y,value,r:4,age:0});if(e.type==='boss'){sfx('nova');shake=18;announce('BOSS DISTRUTTO');}else if(combo===10||combo===25||combo===50)announce(combo===50?'MASSACRO ASSOLUTO':combo===25?'REAZIONE A CATENA':'COMBO × 10');sfx('hit');}}
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
 mode='upgrade';showModal('ARSENALE MUTANTE / LIVELLO '+player.level,'SCEGLI IL TUO PROSSIMO POTERE.','24 abilità · 4 rarità · 3 offerte. Ritrova un potere per aumentarlo di 1 grado.');
 $('overlay').classList.add('upgrade-mode');$('homeButton').hidden=true;
 for(const [index,u] of rollUpgrades().entries()){
  const rank=player.ranks[u.id]||0,r=rarities[u.rarity],b=document.createElement('button');
  b.className='upgrade rarity-'+u.rarity;b.style.setProperty('--card-index',index);
  b.innerHTML='<span class="card-top"><span class="rarity-badge">'+r.stars+' '+r.name+'</span><span class="card-number">0'+(index+1)+'</span></span><span class="card-art"><span class="icon">'+u.icon+'</span></span><span class="card-tag">'+u.tag+'</span><b>'+u.name+'</b><span class="rank-label">'+(rank?'POTENZIA · GRADO '+rank+' → '+(rank+1):'NUOVA ABILITÀ · GRADO 1')+'</span><small>'+u.desc+'</small><span class="card-action">'+(rank?'POTENZIA +1':'SBLOCCA POTERE')+' <span>↗</span></span>';
  b.onclick=()=>{if(mode!=='upgrade')return;mode='play';u.apply(player);player.ranks[u.id]=rank+1;pendingUpgrades=Math.max(0,pendingUpgrades-1);sfx('upgrade');announce(u.name.toUpperCase()+' / GRADO '+(rank+1));if(pendingUpgrades>0)chooseUpgrade();else $('overlay').hidden=true;updateHud();};
  $('choices').append(b);
 }
 const legend=$('rarityLegend');legend.innerHTML=Object.entries(rarities).map(([key,r])=>'<span class="rarity-'+key+'">'+r.name+' <b>'+r.weight+'%</b></span>').join('');
}
function weaponHit(e,amount,critical=false){
 const dealt=Math.min(e.hp,amount*(e.type==='boss'?1+player.bossDamage:1));
 damageEnemy(e,amount,critical);
 player.hp=Math.min(player.maxHp,player.hp+dealt*player.lifesteal);
 if(e.hp>0){e.slowTime=2;e.slow=player.slow;if(player.execute&&e.hp/e.maxHp<=player.execute*(e.type==='boss'?.5:1))damageEnemy(e,e.hp,true);}
 if(player.chain){let count=0;for(const other of enemies){if(other!==e&&other.hp>0&&Math.hypot(other.x-e.x,other.y-e.y)<240){damageEnemy(other,player.damage*.65);ring(other.x,other.y,'#72e3ed',35);if(++count>=player.chain)break;}}}
}
function endRun(win){mode='end';saveBest();showModal(win?'TRASMISSIONE COMPLETATA':'TRASMISSIONE INTERROTTA',win?'SEI TU L’APOCALISSE.':'IL RUMORE SI SPEGNE.',`${score.toLocaleString('it-IT')} punti · ${kills} eliminazioni · livello ${player.level} · ${Math.floor(runTime/60)}m ${Math.floor(runTime%60)}s`);$('continueButton').hidden=false;$('continueButton').textContent='RIPROVA ↗';$('continueButton').onclick=()=>{$('continueButton').textContent='CONTINUA ↗';newRun();};}
function shoot(){let target=null,dist=Infinity;for(const e of enemies){if(e.hp<=0)continue;const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<dist){dist=d;target=e;}}if(!target)return;const angle=Math.atan2(target.y-player.y,target.x-player.x);player.aim=angle;
if(player.hero.id==='knight'){player.recoil=.25;const reach=165+player.reach;ring(player.x,player.y,player.hero.color,reach);for(const e of enemies){const d=Math.hypot(e.x-player.x,e.y-player.y);if(e.hp>0&&d<reach){const critical=Math.random()<player.crit;weaponHit(e,player.damage*(1+(player.shots-1)*.3)*(critical?player.critPower:1),critical);e.x+=Math.cos(Math.atan2(e.y-player.y,e.x-player.x))*28;e.y+=Math.sin(Math.atan2(e.y-player.y,e.x-player.x))*28;}}sfx('hit');return;}
// Keep a shot on the aim line even with an even projectile count; flank it with a tight fan.
for(let i=0;i<player.shots;i++){const offset=i===0?0:Math.ceil(i/2)*(i%2?-1:1)*.035;const a=angle+offset,speed=(player.hero.id==='bomber'?440:720)*player.projectileSpeed;bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:1.8,pierce:player.pierce,hit:new Set(),kind:player.hero.id,bounces:2});}player.recoil=.12;sfx(player.hero.id==='bomber'?'rocket':player.hero.id==='ranger'?'blade':'shoot');}
function update(dt){runTime+=dt;
 if(player.hp>0)player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);
 if(player.aura){player.auraTimer-=dt;if(player.auraTimer<=0){player.auraTimer=1;ring(player.x,player.y,'#ffdb77',210);for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<210)damageEnemy(e,player.damage*player.aura);}}
waveTime=Math.max(0,waveTime-dt);comboTime-=dt;if(comboTime<=0)combo=0;player.recoil=Math.max(0,(player.recoil||0)-dt);player.inv=Math.max(0,player.inv-dt);player.dashCd=Math.max(0,player.dashCd-dt);player.novaCd=Math.max(0,player.novaCd-dt);player.dashTime=Math.max(0,player.dashTime-dt);
 let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const length=Math.hypot(mx,my);if(length){mx/=length;my/=length;player.dx=mx;player.dy=my;}if(player.dashTime>0){mx=player.dx;my=player.dy;burst(player.x,player.y,palette.accent,3,40);}const speed=player.speed*(player.dashTime>0?4.2:1);player.x=clamp(player.x+mx*speed*dt,20,W-20);player.y=clamp(player.y+my*speed*dt,100,H-22);
 shootTimer-=dt;if(shootTimer<=0){shoot();shootTimer=player.rate;}spawnTimer-=dt;if(spawnTimer<=0&&waveTime>0&&enemies.length<260){const count=Math.min(6,3+Math.floor((wave-1)/3),260-enemies.length);for(let i=0;i<count;i++){const roll=Math.random();spawn(wave>2&&roll<.14?'shooter':wave>1&&roll<.34?'tank':roll>.72?'runner':'normal');}spawnTimer=Math.max(.28,.72-wave*.035);}
 if(wave%4===0&&!bossSpawned){spawn('boss');bossSpawned=true;announce(bossNames[Math.floor(wave/4)-1]);sfx('boss');}
 for(const e of enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;let move=e.type==='shooter'&&d<300?-.3:1;e.slowTime=Math.max(0,(e.slowTime||0)-dt);const chill=e.slowTime>0?1-(e.slow||0):1;e.x+=dx/d*e.speed*dt*move*chill;e.y+=dy/d*e.speed*dt*move*chill;e.angle+=dt;e.cd-=dt;if((e.type==='shooter'||e.type==='boss')&&e.cd<=0){if(e.type==='boss')bossAttack(e,Math.atan2(dy,dx));else{e.cd=2.4;const a=Math.atan2(dy,dx);enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,life:6});}}if(d<e.r+player.r){if(player.dashTime>0){if(!e.dashHit){damageEnemy(e,player.damage*3,true);e.dashHit=true;}}else if(player.inv<=0){player.hp-=(e.type==='boss'?25:12)*(1-player.armor);player.inv=.8;shake=9;burst(player.x,player.y,'#bf7052',22,200);tone(80,.2,'sawtooth',.1,undefined,30);}}else e.dashHit=false;}
 for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of enemies){if(e.hp<=0||b.hit.has(e)||b.life<=0)continue;if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+6){b.hit.add(e);const critical=Math.random()<player.crit;weaponHit(e,player.damage*(b.power||1)*(critical?player.critPower:1),critical);if(b.kind==='bomber'){const splash=125+player.pierce*12;ring(b.x,b.y,'#f5d56e',splash);burst(b.x,b.y,'#ff9760',32,270);sfx('explosion');for(const other of enemies){if(other!==e&&other.hp>0&&Math.hypot(other.x-b.x,other.y-b.y)<splash)damageEnemy(other,player.damage*.85*(b.power||1));}b.life=0;}else if(b.kind==='ranger'&&b.bounces>0){let next=null,near=330;for(const other of enemies){const d=Math.hypot(other.x-b.x,other.y-b.y);if(other.hp>0&&!b.hit.has(other)&&d<near){next=other;near=d;}}if(next){const a=Math.atan2(next.y-b.y,next.x-b.x);b.vx=Math.cos(a)*720*player.projectileSpeed;b.vy=Math.sin(a)*720*player.projectileSpeed;b.bounces--;break;}else if(b.pierce--<=0)b.life=0;}else if(b.pierce--<=0)b.life=0;}}}
 for(const b of enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(player.inv<=0&&Math.hypot(b.x-player.x,b.y-player.y)<player.r+(b.r||5)){player.hp-=10*(1-player.armor);player.inv=.6;b.life=0;shake=7;burst(player.x,player.y,'#bf7052',12);}}
 for(const g of gems){g.age+=dt;const dx=player.x-g.x,dy=player.y-g.y,d=Math.hypot(dx,dy)||1;if(d<player.magnet){g.x+=dx/d*(350+g.age*8)*dt;g.y+=dy/d*(350+g.age*8)*dt;}if(d<21){player.xp+=g.value*(1+player.xpBonus);g.collected=true;sfx('gem');while(player.xp>=player.nextXp){player.xp-=player.nextXp;player.level++;player.nextXp=Math.round(player.nextXp*1.23);pendingUpgrades++;}}}
 gems=gems.filter(g=>!g.collected);if(gems.length>450){const extra=gems.splice(0,gems.length-450);gems[0].value+=extra.reduce((sum,g)=>sum+g.value,0);}enemies=enemies.filter(e=>e.hp>0);bullets=bullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>0&&b.y<H+50);enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>0&&b.y<H+50);
 if(player.hp<=0&&player.revives>0){player.revives--;player.hp=player.maxHp;player.inv=3;ring(player.x,player.y,'#ffdb77',300);announce('PROTOCOLLO FENICE / RINASCITA');}if(player.hp<=0){player.hp=0;endRun(false);}else if(pendingUpgrades>0)chooseUpgrade();else if(waveTime<=0&&enemies.length===0){if(wave===12){endRun(true);}else{wave++;waveTime=30+Math.min(15,wave*2);bossSpawned=false;player.hp=Math.min(player.maxHp,player.hp+12);if((wave-1)%4===0){palette=palettes[(arena+Math.floor((wave-1)/4))%3];$('arenaName').textContent=palette.name;}announce('ONDATA '+String(wave).padStart(2,'0'));}}updateHud();
}
function updateHud(){updateBossHud();$('healthText').textContent=Math.ceil(player.hp)+' / '+player.maxHp;$('healthBar').style.width=(player.hp/player.maxHp*100)+'%';$('xpBar').style.width=(player.xp/player.nextXp*100)+'%';$('levelText').textContent=player.level;$('waveText').textContent='ONDATA '+String(wave).padStart(2,'0')+' / 12';$('timer').textContent='00:'+String(Math.ceil(waveTime)).padStart(2,'0');$('enemyCount').textContent=waveTime<=0?'ELIMINA I SUPERSTITI':enemies.length+' SEGNALI OSTILI';$('score').textContent=String(score).padStart(6,'0');$('combo').textContent=combo>1?combo+' COMBO / ×'+(1+Math.min(4,Math.floor(combo/10))):'';$('dashText').textContent=player.dashCd>0?player.dashCd.toFixed(1)+' s':'PRONTO';$('novaText').textContent=player.novaCd>0?player.novaCd.toFixed(1)+' s':'PRONTO';$('dashButton').disabled=player.dashCd>0;$('novaButton').disabled=player.novaCd>0;}
const bossNames=['GORATH / RE DEI PREDONI','MYCELIA / REGINA DELLE SPORE','OMEGA / CUORE DELLA FORGIA'];
function updateBossHud(){
 const boss=enemies.find(e=>e.type==='boss'&&e.hp>0);
 $('bossHud').hidden=!boss;
 if(!boss)return;
 const kind=boss.bossKind||0;
 $('bossHud').style.color=['#ff9760','#e58bbb','#82b5de'][kind];
 $('bossName').textContent=bossNames[kind]+(boss.hp<boss.maxHp*.5?' / FURIA':'');
 $('bossHealth').style.width=(clamp(boss.hp/boss.maxHp,0,1)*100)+'%';
}
function bossAttack(e,aim){
 const kind=e.bossKind||0,furious=e.hp<e.maxHp*.5;e.phase++;e.cd=(furious?1.1:1.8)+(kind===1?.25:0);
 const emit=(a,speed,r,color)=>enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:6,r,color});
 if(kind===0){const count=furious?7:5;for(let i=0;i<count;i++)emit(aim+(i-(count-1)/2)*.24,210,7,'#ff9e59');if(furious&&e.phase%2===0)ring(e.x,e.y,'#ff9e59',140);}
 else if(kind===1){const count=furious?18:12;for(let i=0;i<count;i++)emit(TAU*i/count+e.phase*.27,furious?145:115,8,'#d58aff');}
 else{const count=furious?20:14;for(let i=0;i<count;i++)emit(TAU*i/count+e.phase*.19,195,6,'#ff6e80');for(let i=-1;i<=1;i++)emit(aim+i*.15,280,5,'#ffdb7c');}
 burst(e.x,e.y,['#ffbd68','#d58aff','#ff6e80'][kind],12,100);
}
// Original pixel sprites: each character is one source pixel.
const spriteMaps={
 gunslinger:[
 '......000000......','.....02222220.....','.....02333320.....','.....02444420.....','......022220......','...000055550000...','..02220266202220..','..02320244202320..','..02220266202220..','...000266662000...','...020266662020...','...020022220020...','...040.0550.040...','...040.0220.040...','...000.0220.000...','.......0220.......','......020020......','......020020......','.....02200220.....','.....00000000.....'],
 knight:[
 '...55........55...','...055......550...','....0550000550....','.....02222220.....','....0223322220....','...022244422220...','...022222222220...','....0225555220....','..00002222220000..','.0222026666202220.','.0232026556202320.','..02002666620020..','..02002666620020..','...000266662000...','....022222220.....','...02220022220....','...0220..02220....','...0550..05550....','...0000..00000....'],
 bomber:[
 '.......0000.......','.......0550.......','.......0550.......','......022220......','......023320......','...000244442000...','..02222666622220..','..02322644622320..','..02322666622320..','..02222222222220..','...000022220000...','..00000222200000..','.0222202222022220.','.0233202222023320.','.0222200000022220.','.033330....033330.','.022220....022220.','..0000......0000..'],
 ranger:[
 '........55........','.......0550.......','......022220......','.....02233220.....','....0223333220....','...022300003220...','...023044440320...','...023000000320...','....0223333220....','..00002222220000..','.0222026666202220.','..02202644620220..','...020266662020...','....0026666200....','.....02222220.....','....0222222220....','...022200222220...','..02220..0222220..','...020....02220...','....0......020....','............0.....']
};
// Forearms are drawn separately so they can follow the weapon in every direction.
const bodyMaps=Object.fromEntries(Object.entries(spriteMaps).map(([id,rows])=>[id,rows.map((row,r)=>{
 const detached=id==='gunslinger'?r>=9&&r<=14:id==='knight'?r>=11&&r<=13:id==='ranger'?r>=11&&r<=13:false;
 return detached?[...row].map((pixel,c)=>c<6||c>10?'.':pixel).join(''):row;
})]));
const enemyMaps={
 normal:['..5......5..','..05....50..','..02222220..','.0223322220.','023444443320','022022220220','.022552220..','..0222220...','..020020....','.02200220...','.00000000...'],
 runner:['.....5......','....055.....','...022220...','..02233220..','.0224444220.','..02222220..','...022220...','..02200220..','.0220..0220.','..00....00..'],
 tank:['..00000000..','.0222222220.','023333333320','022444444220','022000000220','022266662220','022264462220','.0226666220.','..02222220..','.0220..0220.','.0550..0550.','.0000..0000.'],
 shooter:['....5555....','..55222255..','.5223333225.','522333333225','022555555220','..02444420..','..02222220..','.0226666220.','..02266220..','...022220...','..02200220..','..00000000..']
};
function sprite(rows,x,y,pixel,colors,flip=false){
 const width=rows[0].length;pixel=Math.max(1,Math.round(pixel));
 const left=Math.round(x/pixel)*pixel-Math.floor(width/2)*pixel;
 const top=Math.round(y/pixel)*pixel-Math.floor(rows.length/2)*pixel;
 for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
  const color=colors[rows[r][c]];if(!color)continue;
  ctx.fillStyle=color;ctx.fillRect(left+(flip?width-1-c:c)*pixel,top+r*pixel,pixel,pixel);
 }
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function pixelRing(x,y,r,color){ctx.fillStyle=color;for(let i=0;i<32;i++){const a=TAU*i/32;ctx.fillRect(Math.round((x+Math.cos(a)*r)/3)*3,Math.round((y+Math.sin(a)*r)/3)*3,4,4);}}
function drawPlayer(x,y,scale=1,angle=0,h=heroes[selectedHero],aim=0){
 const p=Math.max(3,Math.round(scale)*3);
 const bob=mode==='play'&&player&&(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight)?Math.floor(time*10)%2*p:0;
 const colors={'0':'#101426','2':h.coat,'3':h.color,'4':'#f8f4c4','5':h.id==='knight'?'#ffc15a':h.color,'6':h.id==='gunslinger'?'#496d96':h.id==='knight'?'#ac4e47':h.id==='bomber'?'#6f8191':'#765baf'};
 rect(x-9*p,y+10*p,18*p,2*p,'#111426');
 const side=Math.cos(aim)<0?-1:1;
 sprite(bodyMaps[h.id],x,y+bob,p,colors,side<0);
 ctx.save();
 ctx.translate(x,y+bob);
 ctx.rotate(aim);
 ctx.scale(1,side);
 const recoil=mode==='play'&&player&&player.hero===h?(player.recoil||0)*8*p:0;
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
 if(h.id==='ranger'){pixelRing(wx,wy,4*p,h.color);rect(wx-p,wy-5*p,p*2,p*2,'#fff4dc');rect(wx-5*p,wy-p,p*2,p*2,'#fff4dc');}
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
 if(W<851)return;
 const x=Math.round(W*.79/3)*3,y=Math.round(H*.44/3)*3;
 const s=Math.max(2,Math.min(4,Math.floor(H/230)));
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
  c.width=104;c.height=80;ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  drawPlayer(48,40,1,0,heroes[i],0);
 });ctx=original;
}
paintPortraits();
function draw(){
 textCtx.clearRect(0,0,W,H);textCtx.save();
 ctx.save();ctx.imageSmoothingEnabled=false;if(shake>0){const sx=Math.round(rand(-shake,shake)/3)*3,sy=Math.round(rand(-shake,shake)/3)*3;ctx.translate(sx,sy);textCtx.translate(sx,sy);}
 background();if(mode==='menu'){drawMenu();ctx.restore();textCtx.restore();return;}
 for(const g of gems){sprite(['..3..','.343.','34443','.343.','..3..'],g.x,g.y,2,{'3':palette.accent,'4':'#fff4dc'});}
 for(const e of enemies)drawEnemy(e);
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
 ctx.restore();textCtx.restore();
}

function frame(now){const dt=Math.min(.033,(now-last)/1000||.016);last=now;time+=dt;if(mode==='play'){update(dt);shake=Math.max(0,shake-dt*32);announceTime-=dt;$('announcement').style.opacity=clamp(announceTime,0,1);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const r of rings){r.life-=dt;r.r+=(r.max-r.r)*dt*8;}rings=rings.filter(r=>r.life>0);for(const l of labels){l.y-=dt*45;l.life-=dt;}labels=labels.filter(l=>l.life>0);}draw();requestAnimationFrame(frame);}
startMenuMusic();
requestAnimationFrame(frame);
})();
