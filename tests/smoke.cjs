const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
const noop = () => {};
const context = new Proxy({}, {get: (_,key) => ['createRadialGradient','createLinearGradient'].includes(key) ? () => ({addColorStop:noop}) : noop, set: () => true});
function element(id) {
  if (!elements.has(id)) elements.set(id, {value:'0',hidden:false,classList:{add:noop,remove:noop},style:{setProperty:noop},children:[],textContent:'',getContext:()=>context,setAttribute(k,v){this[k]=v;},replaceChildren(){this.children=[];},append(v){this.children.push(v);}});
  return elements.get(id);
}
const sandbox = {document:{getElementById:element,createElement:()=>({style:{setProperty:noop},getContext:()=>context,setAttribute(k,v){this[k]=v;}}),querySelectorAll:(q)=>q==='.hero-card'?element('roster').children:[],querySelector:()=>element('superLabel')},window:{},innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},setInterval:noop,clearInterval:noop,console,Math};
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
assert.equal(element('roster').children.length,4);
for(let i=0;i<4;i++){t.selectHero(i);t.newRun();assert.equal(t.state().player.hero.id,['gunslinger','knight','bomber','ranger'][i]);t.clear();const p=t.state().player;t.spawn('tank');t.place(p.x+65,p.y);const hp=t.state().enemies[0].hp;t.shoot();if(i===1){assert.ok(t.state().enemies[0].hp<hp,'seismic axe deals area damage');assert.equal(t.projectiles().length,0);}else{assert.equal(t.projectiles().length,i===0?2:1);}t.draw();t.nova();assert.ok(t.state().player.novaCd>0);if(i===0||i===3){assert.equal(t.projectiles().filter(b=>b.power===2.5).length,32,'super creates 32 empowered projectiles');}if(i===2){assert.equal(t.projectiles().filter(b=>b.power===2).length,12,'mech super launches twelve missiles');}t.home();}
for(const index of [2,3]){t.selectHero(index);t.newRun();t.clear();const p=t.state().player;t.spawn('tank');t.place(p.x+36,p.y);t.spawn('tank');t.place(p.x+100,p.y);const target=t.state().enemies[1],hp=target.hp;t.shoot();for(let step=0;step<10;step++)t.update(1/60);assert.ok(target.hp<hp,index===2?'bomb splash damages second target':'dart ricochets into second target');t.home();}
// Even volleys must hit small targets at range, with a much tighter fan.
for(const shots of [2,4,6,8,9]){t.selectHero(0);t.newRun();t.clear();const p=t.state().player;p.x=100;p.y=450;p.shots=shots;p.damage=1;p.rate=100;p.crit=0;t.spawn('runner');t.place(900,450);const target=t.state().enemies[0];target.speed=0;target.hp=target.maxHp=1000;const hp=target.hp;t.shoot();const angles=t.projectiles().map(b=>Math.atan2(b.vy,b.vx));assert.ok(angles.some(a=>Math.abs(a)<1e-10),'a shot follows the aim line');assert.ok(Math.max(...angles)-Math.min(...angles)<=.281,'fan stays tight at maximum upgrades');for(let step=0;step<75;step++)t.update(1/60);assert.ok(target.hp<hp,shots+' projectiles hit a small distant target');t.home();}
// The first wave now sends three enemies per group, about three times the old density.
t.newRun();t.state().player.rate=100;t.state().player.damage=0;for(let step=0;step<240;step++)t.update(1/60);assert.ok(t.state().enemies.length>=18,'first wave sends at least 18 enemies in four seconds');t.home();

t.selectHero(0);t.draw();t.newRun();assert.equal(t.state().mode,'play');
for(let i=0;i<240;i++){t.update(1/60);t.draw();}
assert.ok(t.state().enemies.length>0,'enemies spawn');
t.dash();assert.ok(t.state().player.dashCd>0,'dash cooldown');
t.nova();assert.ok(t.state().player.novaCd>0,'nova cooldown');
t.pause();assert.equal(t.state().mode,'pause');t.pause();assert.equal(t.state().mode,'play');
t.xp();t.update(1/60);assert.equal(t.state().mode,'upgrade');assert.equal(element('choices').children.length,3);
element('choices').children[0].onclick();assert.equal(t.state().mode,'play');
t.stage(3);t.update(1/60);assert.equal(t.state().wave,4);t.update(1/60);assert.ok(t.state().enemies.some(e=>e.type==='boss'),'boss spawns on fourth wave');
t.stage(4);t.update(1/60);assert.equal(t.state().wave,5);
t.stage(12);t.update(1/60);assert.equal(t.state().mode,'end');assert.equal(element('modalTitle').textContent,'SEI TU L’APOCALISSE.');
t.newRun();t.kill();t.update(1/60);assert.equal(t.state().mode,'end');assert.equal(element('modalTitle').textContent,'IL RUMORE SI SPEGNE.');
t.home();assert.equal(t.state().mode,'menu');
console.log('PASS: four heroes, hammer area damage, bomb splash, dart ricochets, menu rendering, combat simulation, dash, nova, pause, upgrades, boss, arena transition, victory, defeat, return to menu.');
