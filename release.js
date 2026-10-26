'use strict';
// Local-only player profile. No network, identifiers, advertisements or telemetry.
(() => {
const $=id=>document.getElementById(id), STORE='killme2-profile-v1', RUN='killme2-run-v1';
const fresh=()=>({version:1,tutorial:false,heroes:{},daily:{},stats:{runs:0,wins:0},language:'it'});
let profile=fresh(),api,elapsed=0,tutorial=-1,tutorialOrigin=null,runId='',settled=false,daily=false,restoring=false;
try { const p=JSON.parse(localStorage.getItem(STORE));if(p?.version===1&&p.heroes&&p.stats)profile={...fresh(),...p}; } catch {}
const say=(it,en)=>window.KMI18n?.language==='en'?en:it;
function notice(it,en){const text=say(it,en);if($('saveStatus').textContent!==text)$('saveStatus').textContent=text;}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(profile));return true;}catch{notice('Spazio esaurito: impossibile salvare. Esporta i progressi.','Storage full: cannot save. Export your progress.');return false;}}
function hero(id){let h=profile.heroes[id];if(!h||typeof h!=='object')h=profile.heroes[id]={};for(const key of ['xp','runs','wins','bestCombo','bosses'])if(!Number.isFinite(h[key])||h[key]<0)h[key]=0;if(!['original','cobalt','ember','prism'].includes(h.style))h.style='original';if(!['standard','heavy','swift'].includes(h.variant))h.variant='standard';return h;}
function level(h){return Math.min(20,1+Math.floor(Math.sqrt(h.xp/100)));}
function day(){return new Date().toISOString().slice(0,10);}
function seedFor(date){let h=2166136261;for(const c of date)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function render(){
 if(!api)return;
 $('tutorialButton').textContent=profile.tutorial?say('RIGIOCA ADDESTRAMENTO','REPLAY TRAINING'):say('INIZIA QUI · ADDESTRAMENTO','START HERE · TRAINING');
 let saved=null;try{saved=JSON.parse(localStorage.getItem(RUN));}catch{}
 $('resumeRunButton').hidden=!saved;
 $('resumeRunButton').textContent=say('CONTINUA PARTITA','CONTINUE RUN')+(saved?' · '+saved.heroName+' · '+say('ondata ','wave ')+saved.state.wave:'');
 $('dailyLabel').textContent=say('SFIDA DEL GIORNO','DAILY CHALLENGE')+' · '+day()+' UTC';
 const result=profile.daily[day()];$('dailyResult').textContent=result?say('Record personale: ','Personal best: ')+result.score+' · '+say('ondata ','wave ')+result.wave:say('Stesso eroe, arena e sequenza casuale per tutti. Classifica solo locale.','Same hero, arena and random sequence for everyone. Local scores only.');
 $('masteryCards').replaceChildren();
 for(const h of api.heroes){const p=hero(h.id),l=level(p),card=document.createElement('article');card.className='mastery-card';
 const title=document.createElement('h3');title.textContent=h.name+' · '+say('MAESTRIA ','MASTERY ')+l;
 const detail=document.createElement('p');detail.textContent=p.xp+' XP · '+p.runs+' '+say('partite','runs')+' · '+p.wins+' '+say('vittorie','wins');
 const goal=document.createElement('p');goal.textContent=l<20?say('Prossimo grado: ','Next rank: ')+(l*l*100-p.xp)+' XP':say('Maestria massima raggiunta','Maximum mastery reached');
 const select=document.createElement('select');select.setAttribute('aria-label',h.name+' '+say('aspetto','appearance'));
 for(const [value,label,unlocked] of [['original',say('Originale','Original'),true],['cobalt',say('Cobalto · maestria 3','Cobalt · mastery 3'),l>=3],['ember',say('Brace · 5 boss sconfitti','Ember · defeat 5 bosses'),p.bosses>=5],['prism',say('Prisma · combo 50','Prism · combo 50'),p.bestCombo>=50]]){const o=document.createElement('option');o.value=value;o.textContent=label;o.disabled=!unlocked;select.append(o);}
 select.value=p.style;select.onchange=()=>{p.style=select.value;persist();api.refreshStyles();};
 const variant=document.createElement('select');variant.setAttribute('aria-label',h.name+' '+say('variante arma','weapon variant'));
 for(const [value,label,min]of [['standard',say('Arma standard','Standard weapon'),1],['heavy',say('Pesante · +25% danni, attacchi 25% più lenti · grado 2','Heavy · +25% damage, attacks 25% slower · rank 2'),2],['swift',say('Rapida · attacchi 20% più rapidi, −20% danni · grado 4','Swift · attacks 20% faster, −20% damage · rank 4'),4]]){const o=document.createElement('option');o.value=value;o.textContent=label;o.disabled=l<min;variant.append(o);}variant.value=p.variant||'standard';variant.onchange=()=>{p.variant=variant.value;persist();};
 card.append(title,detail,goal,select,variant);$('masteryCards').append(card);
 }
}
function saveRun(){
 if(!api||tutorial>=0||restoring)return;
 const data=api.snapshot();if(!data)return;
 try{localStorage.setItem(RUN,JSON.stringify({version:1,id:runId,daily,date:daily?api.dailyDate:null,seed:api.getSeed(),heroName:data.player.hero.name,state:data,savedAt:new Date().toISOString()}));notice('Partita salvata sul dispositivo','Run saved on this device');}catch{notice('Salvataggio non riuscito: controlla lo spazio disponibile.','Save failed: check available storage.');}
}
function discard(){try{localStorage.removeItem(RUN);}catch{}render();}
const tutorialSteps=[
 ['Muoviti fino al cerchio azzurro. Su telefono trascina a sinistra; su PC usa WASD o le frecce.','Move to the blue circle. On mobile drag on the left; on PC use WASD or arrow keys.'],
 ['Usa SCATTO: attraversi i colpi e diventi brevemente invulnerabile. Spazio su PC.','Use DASH: pass through projectiles with brief invulnerability. Space on PC.'],
 ['Usa SUPER COLPO per liberare l’area. Tasto E su PC.','Use SUPER to clear the area. E on PC.'],
 ['Avvicinati al bersaglio rosso: attacchi e miri automaticamente. Raccogli il cristallo che lascia.','Approach the red target: aiming and attacking are automatic. Collect its crystal.'],
 ['Scegli una carta potere. Puoi prenderti il tempo che serve; il timer è facoltativo nelle impostazioni.','Choose an upgrade card. Take your time; the timer is optional in settings.']
];
function tutorialText(){const text=tutorialSteps[tutorial];if(text){$('tutorialText').textContent=(tutorial+1)+'/5 · '+say(...text);$('tutorialPanel').hidden=false;}}
function startTutorial(){api.ensureReplace(()=>{daily=false;tutorial=0;api.startTutorial();tutorialOrigin=api.state().player.x;tutorialText();});}
function finishTutorial(completed=true){tutorial=-1;$('tutorialPanel').hidden=true;if(completed)profile.tutorial=true;persist();api.finishTutorial();if(completed)notice('Addestramento concluso. Scegli ora la tua avventura.','Training complete. Choose your adventure.');render();}
function dailyStart(){api.ensureReplace(()=>{daily=true;tutorial=-1;api.dailyDate=day();api.seed(seedFor(day()));const n=seedFor(day());api.startDaily(n%4,Math.floor(n/4)%3);});}
function download(name,data){const json=JSON.stringify(data,null,2);if(window.AndroidHost?.exportProgress){window.AndroidHost.exportProgress(json);return;}const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validTree(v,depth=0){if(depth>18)return false;if(typeof v==='number')return Number.isFinite(v);if(v===null||typeof v!=='object')return ['string','boolean','undefined'].includes(typeof v)||v===null;return Object.entries(v).every(([k,x])=>!['__proto__','constructor','prototype'].includes(k)&&validTree(x,depth+1));}
function validateRun(saved){
 const s=saved?.state,p=s?.player;
 if(saved?.version!==1||!validTree(saved)||!s||!p||typeof saved.id!=='string'||!(saved.seed===null||Number.isInteger(saved.seed)))return false;
 if(!Number.isInteger(s.wave)||s.wave<1||s.wave>100000||!api.heroes.some(h=>h.id===p.hero?.id)||p.hp<=0||p.hp>p.maxHp||p.maxHp>=1e12||p.x<0||p.x>2800||p.y<0||p.y>2200)return false;
 if(!(s.campaignRun===null||Number.isInteger(s.campaignRun)&&s.campaignRun>=0&&s.campaignRun<api.missionCount)||s.campaignRun!==null&&!s.missionState||!Number.isInteger(s.arena)||s.arena<0||s.arena>2||typeof s.bossMode!=='boolean')return false;
 if(!['waveTime','spawnTimer','shootTimer','score','kills','combo','comboTime','runTime','pendingUpgrades','heat','furyTime','furyCount','peakCombo','eliteTimer','bossesDefeated'].every(k=>Number.isFinite(s[k])))return false;
 if(!['x','y','hp','maxHp','damage','rate','speed','level','xp','nextXp','dashCd','novaCd','inv','r','armor'].every(k=>Number.isFinite(p[k]))||!p.ranks||Object.entries(p.ranks).some(([id,n])=>!api.upgradeIds.includes(id)||!Number.isInteger(n)||n<0))return false;
 if(!['enemies','bullets','enemyBullets','gems','drops'].every(k=>Array.isArray(s[k])&&s[k].length<=5000)||!s.enemies.every(e=>['hp','maxHp','x','y','speed','cd','r'].every(k=>Number.isFinite(e[k]))))return false;
 if(!s.bullets.every(b=>Array.isArray(b.hit)&&b.hit.every(i=>Number.isInteger(i)&&i>=0&&i<s.enemies.length))||!Array.isArray(s.previousOffers)||!s.waveEvent)return false;
 return !s.activeUpgrade||Array.isArray(s.activeUpgrade.ids)&&s.activeUpgrade.ids.length===3&&s.activeUpgrade.ids.every(id=>api.upgradeIds.includes(id))&&Number.isFinite(s.activeUpgrade.remaining);
}
function resumeSaved(){let saved;try{saved=JSON.parse(localStorage.getItem(RUN));}catch{}if(!validateRun(saved)){notice('Salvataggio non valido. Puoi iniziare una nuova partita.','Invalid save. You can start a new run.');return;}try{restoring=true;daily=!!saved.daily;api.dailyDate=saved.date;runId=saved.id;api.restore(saved.state);api.seedState(saved.seed);settled=false;}catch(e){api.home();notice('Impossibile ripristinare la partita. Il salvataggio è conservato.','Cannot restore this run. Your save has been kept.');console.error(e);}finally{restoring=false;render();}}
window.KMRelease={
 get tutorial(){return tutorial>=0;},get daily(){return daily;},get restoring(){return restoring;},profile,
 hero,level,random,render,saveRun,discard,validateRun,
 applyVariant(player){if(daily||tutorial>=0)return;const h=hero(player.hero.id),l=level(h);if(h.variant==='heavy'&&l>=2){player.damage*=1.25;player.rate*=1.25;}if(h.variant==='swift'&&l>=4){player.damage*=.8;player.rate*=.8;}},
 begin(){if(restoring)return;if(daily&&api.dailyDate)api.seed(seedFor(api.dailyDate));runId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);settled=false;elapsed=0;},
 normal(){daily=false;tutorial=-1;$('tutorialPanel').hidden=true;api.seed(null);},
 tick(dt){
  if(tutorial>=0){const s=api.state();if(tutorial===0&&s.tutorialTarget&&Math.hypot(s.player.x-s.tutorialTarget.x,s.player.y-s.tutorialTarget.y)<45){tutorial=1;api.setTutorialStage(1);tutorialText();}else if(tutorial===1&&s.player.dashCd>0){tutorial=2;tutorialText();}else if(tutorial===2&&s.player.novaCd>0){tutorial=3;api.setTutorialStage(3);tutorialText();}else if(tutorial===3&&s.player.level>1){tutorial=4;tutorialText();}else if(tutorial===4&&Object.keys(s.player.ranks).length)finishTutorial();return;}
  elapsed+=dt;if(elapsed>=5){elapsed=0;saveRun();}
 },
 settle(win,summary){
  if(settled||tutorial>=0)return '';settled=true;discard();const h=hero(summary.hero),before=level(h),gain=Math.min(600,Math.floor(summary.seconds/3)+Math.min(200,summary.kills)+summary.bosses*40+(win?100:0));
  h.xp+=gain;h.runs++;h.wins+=win?1:0;h.bosses+=summary.bosses;h.bestCombo=Math.max(h.bestCombo,summary.combo);profile.stats.runs++;profile.stats.wins+=win?1:0;
  if(daily){const d=api.dailyDate,old=profile.daily[d];if(!old||summary.score>old.score)profile.daily[d]={score:summary.score,wave:summary.wave};const days=Object.keys(profile.daily).sort();for(const d of days.slice(0,-30))delete profile.daily[d];}
  persist();render();return '\n\n'+say('MAESTRIA','MASTERY')+' +'+gain+' XP'+(level(h)>before?' · '+say('NUOVO GRADO ','NEW RANK ')+level(h):'');
 },
 bind(adapter){api=adapter;
  $('tutorialButton').onclick=startTutorial;$('skipTutorial').onclick=()=>finishTutorial(false);$('dailyButton').onclick=dailyStart;$('resumeRunButton').onclick=resumeSaved;
  $('masteryButton').onclick=()=>{render();$('masteryDialog').showModal();};$('closeMastery').onclick=()=>$('masteryDialog').close();
  $('privacyButton').onclick=()=>$('privacyDialog').showModal();$('closePrivacy').onclick=()=>$('privacyDialog').close();
  $('exportProgress').onclick=()=>{saveRun();let run=null;try{run=JSON.parse(localStorage.getItem(RUN));}catch{}download('killme2-progress.json',{version:1,profile,campaign:api.campaign(),run});};
  $('importProgress').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('size');const d=JSON.parse(await file.text());if(d.version!==1||!validTree(d)||d.profile?.version!==1||!Number.isInteger(d.campaign?.completed)||d.campaign.completed<0||d.campaign.completed>api.missionCount)throw Error('format');for(const [id,h]of Object.entries(d.profile.heroes||{})){if(!api.heroes.some(x=>x.id===id)||!['xp','runs','wins','bosses','bestCombo'].every(k=>Number.isFinite(h[k])&&h[k]>=0)||!['original','cobalt','ember','prism'].includes(h.style))throw Error('hero');}if(d.run&&!validateRun(d.run))throw Error('run');$('importConfirm').hidden=false;$('confirmImport').onclick=()=>{Object.assign(profile,fresh(),d.profile);persist();api.importCampaign(d.campaign);if(d.run)localStorage.setItem(RUN,JSON.stringify(d.run));else localStorage.removeItem(RUN);$('importConfirm').hidden=true;render();notice('Progressi importati','Progress imported');};}catch{notice('File non valido: nessun progresso modificato.','Invalid file: your progress was not changed.');}finally{e.target.value='';}};
  $('cancelImport').onclick=()=>$('importConfirm').hidden=true;
  $('deleteProgress').onclick=()=>$('deleteConfirm').hidden=false;$('cancelDelete').onclick=()=>$('deleteConfirm').hidden=true;$('confirmDelete').onclick=()=>{for(const k of [STORE,RUN,'killme2-campaign-v1','neon-requiem-best'])localStorage.removeItem(k);location.reload();};
  for(const id of ['upgradeTimer','pauseUpgrades','joystickMode','touchScale','touchSide','touchOffset']){const input=$(id);input.type==='checkbox'?input.checked=api.preferences[id]:input.value=api.preferences[id];input.onchange=input.oninput=()=>{api.preferences[id]=input.type==='checkbox'?input.checked:input.type==='range'?+input.value:input.value;api.savePreferences();api.applyControls();};}
  $('languageSelect').value=window.KMI18n?.language||'it';$('languageSelect').onchange=()=>{window.KMI18n.setLanguage($('languageSelect').value);render();};
  document.addEventListener('killme2language',()=>{render();if(tutorial>=0)tutorialText();$('saveStatus').textContent='';});
  window.addEventListener('pagehide',saveRun);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveRun();});
  api.applyControls();render();
 }
};
})();
