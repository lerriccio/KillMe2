const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.animQA={
   clips:heroClips,frames:heroFrames,heroes,
   start(i){music.enabled=false;selectHero(i);newRun();stopMusic();enemies=[];spawnTimer=eliteTimer=shootTimer=1000;player.inv=1000;},
   pose:()=>heroPose(player.hero,true),tick:tickHeroAnimation,update,pause,dash,nova,shoot,spawn,collectLoot,
   animate:animateHero,state:()=>player,move(on){keys.KeyD=on;},
   target(){spawn('tank');const e=enemies.at(-1);e.x=player.x+100;e.y=player.y;e.speed=0;e.hp=e.maxHp=1e6;},
   contact(){enemies=[];spawn('normal');const e=enemies[0];e.x=player.x;e.y=player.y;e.speed=0;player.inv=0;player.dashTime=0;shootTimer=1000;},
   clear(){player.animation=null;player.dashTime=0;player.moving=false;},
   renderSheet(){const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=1040;const c=sheet.getContext('2d');c.fillStyle='#141a2b';c.fillRect(0,0,sheet.width,sheet.height);const original=ctx;ctx=c;
    heroes.forEach((hero,col)=>{c.fillStyle=hero.color;c.font='bold 18px monospace';c.fillText(hero.name,24+col*360,28);
     Object.entries(heroClips).forEach(([state,clip],row)=>{c.fillStyle='#cbd6ed';c.font='12px monospace';c.fillText(state+' / '+clip.count+' cels',24+col*360,55+row*98);
      [0,Math.floor(clip.count/2),clip.count-1].forEach((f,j)=>{player.hero=hero;player.animation={state,elapsed:(f+.01)/clip.fps};drawPlayer(65+col*360+j*105,98+row*98,1,0,hero,0);});
     });});ctx=original;return sheet.toDataURL();}
  };\n})();`);
  await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto('file:///C:/Games/KillMe2/index.html');
  const result=await page.evaluate(()=>{
   const q=animQA,check=(ok,label)=>{if(!ok)throw Error(label);};let cels=0;
   for(const hero of q.heroes){
    for(const [state,clip] of Object.entries(q.clips)){
     const frames=q.frames[hero.id][state];cels+=frames.length;
     check(frames.length===clip.count,'clip length');
     check(new Set(frames.map(f=>f.join(''))).size>1,hero.id+' '+state+' changes pixels');
     check(frames.every(f=>f.length===28&&f.every(row=>row.length===25&&/^[.0234567]+$/.test(row))),'valid cels');
    }
   }
   for(let i=0;i<4;i++){
    q.start(i);check(q.pose().state==='spawn','entry');q.tick(1);check(q.pose().state==='idle','entry completes');
    q.move(true);q.update(1/60);check(q.pose().state==='walk','movement');q.move(false);
    q.clear();q.target();q.shoot();check(q.pose().state==='attack','attack');
    q.nova();check(q.pose().state==='super','super overrides attack');q.shoot();check(q.pose().state==='super','shots preserve super');
    q.dash();check(q.pose().state==='dash','dash priority');q.tick(.21);check(!q.state().animation,'dash completes');
    q.clear();q.collectLoot({kind:'heal',x:0,y:0,life:1});check(q.pose().state==='heal','healing');
    q.clear();q.contact();const hp=q.state().hp;q.update(1/60);
    check(q.state().hp<hp&&q.pose().state==='hurt','damage triggers hurt');q.tick(.26);check(!q.state().animation,'hurt completes');
    q.animate('upgrade');q.pause();const before=JSON.stringify(q.pose());q.pause();check(JSON.stringify(q.pose())===before,'pause preserves pose');
    q.animate('hurt');q.state().hp=0;q.state().revives=1;q.state().inv=1000;q.update(1/60);
    check(q.state().hp>0&&q.pose().state==='spawn','revival overrides damage pose');
   }
   return {cels,heroes:q.heroes.length,clips:Object.keys(q.clips).length};
  });
  assert.deepEqual(result,{cels:280,heroes:4,clips:10});
  const sheet=await page.evaluate(()=>animQA.renderSheet());
  fs.writeFileSync('tests/animation-sequences.png',Buffer.from(sheet.split(',')[1],'base64'));
  assert.deepEqual(errors,[]);
  console.log('PASS: 280 pixel-art cels, 10 sequences for each of 4 heroes; movement, combat, priorities, completion and pause.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
