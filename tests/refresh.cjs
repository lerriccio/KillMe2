const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const harness=fs.readFileSync('tests/smoke.cjs','utf8').split('let source=')[0];
const hook=`globalThis.refreshQA={
 setup(defend=false){campaignRun=defend?2:null;newRun();enemies=[];bullets=[];enemyBullets=[];spawnTimer=eliteTimer=shootTimer=999;player.inv=0;player.regen=0;},
 player:()=>player,spawn,update,shoot,
 enemies:()=>enemies,bullets:()=>bullets,
 defend(){spawn('normal');Object.assign(enemies[0],{x:W/2,y:H*.55,speed:0});player.x=100;player.y=200;},
 fast(){spawn('runner');Object.assign(enemies[0],{x:200,y:400,speed:0,hp:1000,maxHp:1000});bullets=[{x:100,y:400,vx:10000,vy:0,life:1,pierce:0,hit:new Set(),kind:'gunslinger'}];},
 axe(){player.hero=heroes[1];player.x=400;player.y=400;spawn('tank');Object.assign(enemies[0],{x:450,y:450,hp:10000});},
 combo(){combo=9;player.novaCd=8;player.dashCd=2;damageEnemy(enemies[0],100000);},
};})();`;
const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',hook);
const realm={require,console};vm.runInNewContext(harness+`\nvm.runInNewContext(${JSON.stringify(source)},sandbox);globalThis.qa=sandbox.refreshQA;`,realm);
const q=realm.qa;
q.setup(true);q.defend();const hp=q.player().hp;q.update(.016);assert.equal(q.player().hp,hp,'generator contact must not remotely damage the hero');
q.setup();q.fast();q.update(.033);assert.ok(q.enemies()[0].hp<1000,'fast projectiles hit targets crossed between frames');
q.setup();q.axe();q.shoot();assert.ok(Math.abs((q.enemies()[0].x-450)-(q.enemies()[0].y-450))<.0001,'diagonal axe knockback remains symmetric');
q.combo();assert.equal(q.player().novaCd,7);assert.equal(q.player().dashCd,1.5);
console.log('PASS: generator contact, swept projectile collision, symmetric knockback and combo cooldown rewards.');
