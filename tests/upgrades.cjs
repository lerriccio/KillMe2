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
const sandbox = {document:{addEventListener:noop,getElementById:element,createElement:()=>({style:{setProperty:noop,removeProperty:noop},getContext:()=>context,setAttribute(k,v){this[k]=v;}}),querySelectorAll:(q)=>q==='.hero-card'?element('roster').children:[],querySelector:()=>element('superLabel')},window:{},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},setInterval:noop,clearInterval:noop,console,Math:Object.create(Math)};
let source=fs.readFileSync('game.js','utf8');
source=source.replace('requestAnimationFrame(frame);\n})();', `
globalThis.test = {newRun,update,draw,pause,dash,nova,spawn,damageEnemy,home,selectHero,shoot,bossAttack,upgrades,rarities,rollUpgrades,chooseUpgrade,weaponHit,
  hostile:()=>enemyBullets,
  clear:()=>{enemies=[];bullets=[];},
  place:(x,y)=>{const e=enemies[enemies.length-1];e.x=x;e.y=y;},
  projectiles:()=>bullets,
  state:()=>({mode,player,enemies,wave,score,pendingUpgrades}),
  stage:(w)=>{wave=w;waveTime=0;enemies=[];bossSpawned=true;},
  xp:()=>{gems=[{x:player.x,y:player.y,value:player.nextXp,r:4,age:0}];},
  kill:()=>{player.hp=0;}
};
})();`);
vm.runInNewContext(source,sandbox);
const t=sandbox.test;

t.newRun();
assert.equal(t.upgrades.length,24);
assert.equal(new Set(t.upgrades.map(u=>u.id)).size,24);
let seed=471; sandbox.Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const counts={common:0,rare:0,epic:0,legendary:0},seen=new Set();
for(let i=0;i<20000;i++){
 const cards=t.rollUpgrades();assert.equal(cards.length,3);assert.equal(new Set(cards.map(u=>u.id)).size,3);
 for(const card of cards){counts[card.rarity]++;seen.add(card.id);}
}
assert.equal(seen.size,24);
for(const [tier,count] of Object.entries(counts))assert.ok(Math.abs(count/60000-t.rarities[tier].weight/100)<.012,tier+' distribution');
console.log('Rarity distribution (60,000 cards):',counts);
sandbox.Math.random=()=>0;
t.xp();t.update(1/60);
assert.match(element('choices').children[0].innerHTML,/NUOVA ABILITÀ · GRADO 1/);
element('choices').children[0].onclick();assert.equal(t.state().player.ranks.core,1);
t.xp();t.update(1/60);
assert.match(element('choices').children[0].innerHTML,/GRADO 1 → 2/);
const oldDamage=t.state().player.damage;element('choices').children[0].onclick();
assert.equal(t.state().player.ranks.core,2);assert.ok(Math.abs(t.state().player.damage-oldDamage*1.08)<1e-8);
t.newRun();assert.equal(Object.keys(t.state().player.ranks).length,0);
const ability=id=>t.upgrades.find(u=>u.id===id);
for(let hero=0;hero<4;hero++){
 t.selectHero(hero);t.newRun();
 for(const u of t.upgrades){u.apply(t.state().player);u.apply(t.state().player);}
 for(let step=0;step<120;step++)t.update(1/60);
 assert.ok(Number.isFinite(t.state().player.hp));t.draw();
}
t.selectHero(0);t.newRun();t.clear();let p=t.state().player;
t.spawn('tank');t.place(p.x+150,p.y);let target=t.state().enemies.at(-1);target.hp=target.maxHp=1000;
t.spawn('tank');t.place(p.x+180,p.y);let secondary=t.state().enemies.at(-1);secondary.hp=secondary.maxHp=1000;
ability('chain').apply(p);ability('cryo').apply(p);ability('leech').apply(p);p.hp=50;
t.weaponHit(target,100);assert.equal(secondary.hp,1000-p.damage*.65);assert.equal(target.slow,.18);assert.equal(p.hp,53);
t.newRun();t.clear();p=t.state().player;ability('aura').apply(p);ability('regen').apply(p);p.hp=50;
t.spawn('tank');t.place(p.x+150,p.y);target=t.state().enemies.at(-1);target.hp=target.maxHp=1000;
t.update(.1);assert.ok(target.hp<1000);assert.ok(p.hp>50);
t.newRun();t.clear();p=t.state().player;ability('phoenix').apply(p);t.kill();t.update(.01);assert.equal(p.hp,p.maxHp);assert.equal(p.revives,0);assert.equal(p.inv,3);assert.equal(t.state().mode,'play');
t.kill();t.update(.01);assert.equal(t.state().mode,'end');
t.newRun();t.clear();p=t.state().player;ability('execute').apply(p);t.spawn('tank');target=t.state().enemies.at(-1);target.maxHp=1000;target.hp=160;t.weaponHit(target,20);assert.ok(target.hp<=0);
t.newRun();t.clear();p=t.state().player;ability('hunter').apply(p);t.spawn('boss');target=t.state().enemies.at(-1);const before=target.hp;t.damageEnemy(target,100);assert.equal(target.hp,before-160);
t.newRun();p=t.state().player;ability('dash').apply(p);t.dash();assert.equal(p.dashCd,2.6*.82);ability('super').apply(p);t.nova();assert.equal(p.novaCd,9);
t.newRun();p=t.state().player;ability('study').apply(p);t.xp();t.update(.01);assert.ok(p.xp>.9&&p.xp<1);
t.newRun();p=t.state().player;for(let i=0;i<50;i++)for(const id of ['sight','cryo','leech','execute'])ability(id).apply(p);p.shots=9;
for(let i=0;i<100;i++)assert.ok(t.rollUpgrades().every(u=>!['sight','cryo','leech','execute','crossfire'].includes(u.id)));
console.log('PASS: 24 abilities, weighted rarity, unique offers, repeat rank +1, run reset, all heroes, chain, slow, lifesteal, aura, regen, phoenix, execute, boss damage, cooldowns, XP, capped ability exclusion.');
