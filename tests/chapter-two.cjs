const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const harness=fs.readFileSync('tests/smoke.cjs','utf8').split('let source=')[0];
const hook=`globalThis.forestQA={briefMission,newRun,missionTick,advanceMission,draw,missions,home,endRun,showCampaignMap,
state:()=>({player,missionState,mode,arena,palette,wave,campaignSave,enemies}),unlock:()=>{campaignSave.completed=5;},quiet:()=>{enemies=[];waveTime=0;},destroy:()=>{for(const e of enemies)if(e.relay)damageEnemy(e,999999);},spawnBoss:()=>{wave=2;spawn('boss');}};`;
const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',hook+'\n})();');
const realm={require,console};vm.runInNewContext(harness+`\nvm.runInNewContext(${JSON.stringify(source)},sandbox);globalThis.t=sandbox.forestQA;globalThis.el=element;`,realm);const {t,el}=realm;
t.unlock();t.showCampaignMap();assert.equal(el('missionNodes').children.length,10);assert.equal(el('missionNodes').children.filter(e=>!e.disabled).length,6);
for(let mission=5;mission<10;mission++){
 t.briefMission(mission);t.newRun();let s=t.state();assert.equal(s.arena,1);assert.equal(s.palette.name,'BOSCO DEI FUNGHI');s.player.inv=9999;t.draw();
 const kind=t.missions[mission].kind;
 if(kind==='survive'){for(const [x,y]of [[.38,.46],[.63,.35],[.62,.66]]){s.player.x=2800*x;s.player.y=2200*y;t.missionTick(3.01);}assert.equal(s.missionState.done,3);}
 if(kind==='escort'){t.quiet();const drone=s.missionState.drone;s.player.x=drone.x+400;s.player.y=drone.y;t.missionTick(1);assert.equal(drone.progress,0,'drone waits when player is far away');for(let i=0;i<222;i++){s.player.x=drone.x;s.player.y=drone.y;t.missionTick(.1);}assert.equal(s.missionState.done,3,'escort reaches beacon only while accompanied');}
 if(kind==='destroy'){t.destroy();assert.equal(s.missionState.done,3);}
 if(kind==='recover'){for(const o of s.missionState.objects){s.player.x=2800*o.fx;s.player.y=2200*o.fy;t.missionTick(1.51);}assert.equal(s.missionState.done,3);}
 if(kind==='boss'){t.spawnBoss();assert.equal(t.state().enemies.at(-1).bossKind,1,'chapter two ends with Mycelia');}
 t.quiet();t.advanceMission();t.quiet();t.advanceMission();assert.equal(s.missionState.extracting,true);s.player.x=s.missionState.exit.x;s.player.y=s.missionState.exit.y;t.missionTick(.01);assert.equal(t.state().mode,'end');assert.equal(t.state().campaignSave.completed,mission+1);
}
t.briefMission(5);t.newRun();const s=t.state();s.player.x=2800*.46;s.player.y=2200*.45;s.player.inv=0;s.missionState.elapsed=0;const hp=s.player.hp;t.missionTick(4);assert.equal(s.player.hp,hp,'spores signal before dealing damage');t.missionTick(.6);assert.equal(s.player.hp,hp-8,'active spores deal telegraphed damage');
console.log('PASS: ten-node progression, all five forest objectives, escort proximity, Mycelia, extraction, complete campaign and spore warning/damage.');
