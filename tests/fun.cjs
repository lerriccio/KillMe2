const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
const noop = () => {};
const context = new Proxy({}, {get: (_,key) => ['createRadialGradient','createLinearGradient'].includes(key) ? () => ({addColorStop:noop}) : noop, set: () => true});
function element(id) {
  if (!elements.has(id)) elements.set(id, {value:'0',hidden:false,classList:{add:noop,remove:noop},style:{setProperty:noop,removeProperty:noop},children:[],textContent:'',getContext:()=>context,setAttribute(k,v){this[k]=v;},replaceChildren(){this.children=[];},append(v){this.children.push(v);}});
  return elements.get(id);
}
const sandbox = {document:{addEventListener:noop,getElementById:element,createElement:()=>({style:{setProperty:noop,removeProperty:noop},getContext:()=>context,setAttribute(k,v){this[k]=v;}}),querySelectorAll:(q)=>q==='.hero-card'?element('roster').children:[],querySelector:()=>element('superLabel')},window:{},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},setInterval:noop,clearInterval:noop,console,Math};

let source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();', `globalThis.test={newRun,update,draw,spawn,damageEnemy,dash,beginWave,collectLoot,dropLoot,addHeat,home,pause,
 state:()=>({player,enemies,drops,gems,heat,furyTime,furyCount,peakCombo,waveEvent,mode}),
 wave:w=>{wave=w;beginWave();},
 quiet:()=>{enemies=[];spawnTimer=100;eliteTimer=100;shootTimer=100;},
 shot:()=>{enemyBullets=[{x:player.x+30,y:player.y,vx:0,vy:0,life:5}];},
 hostile:()=>enemyBullets,
 elite:()=>{eliteTimer=0;},
 gem:()=>{gems=[{x:50,y:120,value:2,age:0}];}
};})();`);
vm.runInNewContext(source,sandbox);const t=sandbox.test;
t.newRun();t.quiet();let p=t.state().player;
for(let i=0;i<25;i++){t.spawn('normal');t.damageEnemy(t.state().enemies.at(-1),10000);}
assert.equal(t.state().furyTime,7);assert.equal(t.state().furyCount,1);assert.equal(t.state().peakCombo,25);
t.spawn('tank');let e=t.state().enemies.at(-1);e.hp=e.maxHp=1000;t.damageEnemy(e,10);assert.equal(e.hp,985,'fury increases damage 50%');
t.quiet();t.pause();assert.equal(t.state().furyTime,7);t.pause();t.update(.25);assert.equal(t.state().furyTime,6.75);
t.newRun();t.quiet();p=t.state().player;t.shot();t.dash();t.update(.01);assert.equal(t.hostile().length,0,'dash destroys projectiles');assert.equal(t.state().heat,2);
t.newRun();t.quiet();p=t.state().player;p.hp=20;t.dropLoot(p.x,p.y,'heal');t.update(.01);assert.equal(p.hp,45);assert.equal(t.state().drops.length,0);
t.gem();t.collectLoot({x:p.x,y:p.y,kind:'magnet'});assert.equal(t.state().gems[0].x,p.x);
p.novaCd=10;p.dashCd=2;t.collectLoot({x:p.x,y:p.y,kind:'overdrive'});assert.equal(p.novaCd,5);assert.equal(p.dashCd,0);assert.equal(t.state().heat,40);
t.dropLoot(5,5,'heal');t.state().drops[0].life=.001;t.update(.01);assert.equal(t.state().drops.length,0,'loot expires');
t.newRun();t.quiet();t.elite();t.update(.01);const elite=t.state().enemies.find(e=>e.elite);assert.ok(elite,'elite arrives during normal wave');t.damageEnemy(elite,10000);assert.ok(t.state().drops.length>0,'elite guarantees loot');
const names=new Set();for(let w=1;w<=12;w++){t.wave(w);names.add(t.state().waveEvent.name);if(w%4===0)assert.equal(t.state().waveEvent.name,'CACCIA AL BOSS');}assert.equal(names.size,5,'all modifiers appear');
t.newRun();t.wave(2);t.spawn('normal');t.damageEnemy(t.state().enemies.at(-1),10000);assert.equal(t.state().gems.at(-1).value,4,'gold rush doubles crystals');
t.newRun();assert.equal(t.state().drops.length,0);assert.equal(t.state().heat,0);assert.equal(t.state().furyCount,0);t.draw();
console.log('PASS: fury threshold/damage/duration, dash parry, healing/magnet/reactor/expiry, elite loot, all wave events, doubled XP and run reset.');
