const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
// Reuse the existing Canvas/DOM sandbox, while exercising the real campaign code.
const harness=fs.readFileSync('tests/smoke.cjs','utf8').split('let source=')[0];
const hook=`globalThis.campaignTest={briefMission,newRun,update,advanceMission,showCampaignMap,showComic,comics,finishComic,home,endRun,draw,missionTick,
 state:()=>({campaignRun,missionState,campaignSave,mode,wave,enemies,player}),
 settle:()=>{enemies=enemies.filter(e=>e.relay&&e.hp>0);gems=[];waveTime=0;bossSpawned=true;spawnTimer=999;pendingUpgrades=0;},
 killRelays:()=>{for(const e of enemies)if(e.relay)damageEnemy(e,100000);},
 killBoss:()=>{for(const e of enemies)if(e.type==='boss')damageEnemy(e,100000);},
};`;
const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',hook+'\n})();');
const setup=harness+`\nvm.runInNewContext(${JSON.stringify(source)},sandbox);globalThis.t=sandbox.campaignTest;globalThis.el=element;`;
const realm={require,console};vm.runInNewContext(setup,realm);const {t,el}=realm;
t.showCampaignMap();assert.equal(el('missionNodes').children.filter(b=>!b.disabled).length,1);
t.briefMission(4);assert.equal(t.state().campaignRun,null,'locked missions cannot launch');
t.showComic(t.comics.intro,t.showCampaignMap);t.draw();t.finishComic();assert.equal(t.state().mode,'map');
for(let mission=0;mission<5;mission++){
 t.briefMission(mission);assert.equal(t.state().mode,'brief');t.newRun();t.state().player.inv=9999;t.draw();
 if(mission===1){t.settle();t.update(.016);assert.equal(t.state().wave,1,'live relays block completion');t.killRelays();}
 if(mission===3){t.settle();t.update(.016);assert.equal(t.state().wave,1,'memories are required');for(const o of t.state().missionState.objects){t.state().player.x=1440*o.fx;t.state().player.y=900*o.fy;t.missionTick(.016);}assert.equal(t.state().missionState.done,3);}
 t.settle();t.update(.016);assert.equal(t.state().wave,2);
 if(mission===4){t.update(.016);assert.ok(t.state().enemies.some(e=>e.type==='boss'&&e.bossKind===0),'Gorath appears in final mission');t.killBoss();}
 t.settle();t.update(.016);assert.equal(t.state().mode,'end');assert.equal(t.state().campaignSave.completed,mission+1);
 t.showCampaignMap();assert.equal(el('missionNodes').children.filter(b=>!b.disabled).length,Math.min(5,mission+2));
}
t.briefMission(2);t.newRun();t.state().missionState.hp=0;t.update(.016);assert.equal(t.state().mode,'end');assert.match(el('modalDescription').textContent,/generatore è stato distrutto/);assert.equal(t.state().campaignSave.completed,5);
t.briefMission(0);t.newRun();t.state().player.hp=0;t.update(.016);assert.equal(t.state().mode,'end');assert.equal(t.state().campaignSave.completed,5);
t.showComic(t.comics.ending,t.showCampaignMap);t.draw();t.finishComic();t.home();t.newRun();assert.equal(t.state().campaignRun,null,'Arcade starts independently');
console.log('PASS: locked missions, comics, five mission objectives, Gorath, progression, replay, generator failure, defeat and independent Arcade.');
