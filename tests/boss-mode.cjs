const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
const noop = () => {};
const context = new Proxy({}, {get: (_,key) => ['createRadialGradient','createLinearGradient'].includes(key) ? () => ({addColorStop:noop}) : noop, set: () => true});
function element(id) {
  if (!elements.has(id)) elements.set(id, {addEventListener:noop,value:'0',hidden:false,classList:{add:noop,remove:noop,toggle:noop},style:{setProperty:noop,removeProperty:noop},children:[],textContent:'',getContext:()=>context,setAttribute(k,v){this[k]=v;},replaceChildren(){this.children=[];},append(v){this.children.push(v);}});
  return elements.get(id);
}
const sandbox = {document:{body:{classList:{add:noop,remove:noop,toggle:noop}},addEventListener:noop,getElementById:element,createElement:()=>({style:{setProperty:noop,removeProperty:noop},getContext:()=>context,setAttribute(k,v){this[k]=v;}}),querySelectorAll:(q)=>q==='.hero-card'?element('roster').children:[],querySelector:()=>element('superLabel')},window:{},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,console,Math};
let source=fs.readFileSync('game.js','utf8');
source=source.replace('requestAnimationFrame(frame);\n})();', `globalThis.qa={update,newRun,home,beginWave,bossAttack,spawn,damageEnemy,draw,updateHud,
state:()=>({bossMode,wave,waveTime,mode,enemies,enemyBullets,player}),
stage(w,t=30){wave=w;waveTime=t;enemies=[];enemyBullets=[];bullets=[];gems=[];pendingUpgrades=0;bossSpawned=false;spawnTimer=0;shootTimer=999;beginWave();player.inv=999;player.damage=0;},
clear(){enemies=[];bossSpawned=true;waveTime=0;pendingUpgrades=0;gems=[];},
quiet(){enemies=[];},
};})();`);
vm.runInNewContext(source,sandbox);const q=sandbox.qa;
element('bossButton').onclick();assert.equal(q.state().bossMode,true);
q.update(.016);assert.equal(q.state().enemies.filter(e=>e.type==='boss').length,1);
assert.ok(q.state().enemies.length>=109,'large opening horde');
const first=q.state().enemies.find(e=>e.type==='boss');q.damageEnemy(first,first.hp);q.update(.016);
assert.equal(q.state().enemies.filter(e=>e.type==='boss').length,0,'no second boss after early kill');
let previous;
for(const wave of [1,2,3,4,12,13,40,100]){
 q.stage(wave);q.update(.016);const b=q.state().enemies.find(e=>e.type==='boss');assert.ok(b);assert.equal(b.bossKind,(wave-1)%3);assert.ok(Number.isFinite(b.hp));
 q.bossAttack(b,0);assert.ok(q.state().enemyBullets.every(p=>Number.isFinite(p.vx)&&p.damageScale===b.damageScale));
 if(previous){assert.ok(b.hp>previous.hp);assert.ok(b.damageScale>previous.damageScale);assert.ok(b.speed>previous.speed);assert.ok(b.cd<previous.cd,'attacks accelerate');}
 previous={hp:b.hp,damageScale:b.damageScale,speed:b.speed,cd:b.cd};q.draw();q.updateHud();assert.ok(element('waveText').textContent.includes('∞'));assert.ok(element('bossName').textContent.includes('POTENZA '+wave));
}
q.stage(12,0);q.clear();q.update(.016);assert.equal(q.state().wave,13);assert.equal(q.state().mode,'play');q.update(.016);assert.equal(q.state().enemies.filter(e=>e.type==='boss').length,1);
q.stage(30);for(let i=0;i<600;i++)q.update(.016);assert.equal(q.state().enemies.length,700,'horde reaches bounded cap');assert.equal(q.state().enemies.filter(e=>e.type==='boss').length,1);
q.stage(4,0);q.update(.016);const b=q.state().enemies.find(e=>e.type==='boss');q.quiet();for(let i=0;i<9;i++)q.bossAttack(b,0);assert.equal(q.state().enemies.length,0,'reinforcements stop during cleanup');
q.newRun();assert.equal(q.state().bossMode,true,'retry preserves boss mode');assert.equal(q.state().wave,1);
q.home();element('startButton').onclick();assert.equal(q.state().bossMode,false);q.stage(12,0);q.update(.016);q.clear();q.update(.016);assert.equal(q.state().mode,'end','Arcade still ends');
console.log('PASS: one boss per wave, infinite progression beyond 12, scaling stats and attacks, 700 enemies, cleanup, HUD, retry and Arcade isolation.');
