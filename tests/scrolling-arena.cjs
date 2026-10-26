const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const size of [{width:390,height:844,touch:true},{width:844,height:390,touch:true},{width:1440,height:900,touch:false}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.touch,hasTouch:size.touch});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const hook=`window.arenaQA={state:()=>({camera:{...camera},x:player.x,y:player.y,W,H,viewW,viewH,zoom}),move(){player.inv=999;keys.KeyD=true;},stop(){keys={};},crowd(){wave=12;waveTime=30;bossSpawned=true;enemies=[];spawnTimer=0;shootTimer=999;for(let i=0;i<60;i++){spawnTimer=0;update(.016);}draw();return enemies.length;},mission(){campaignRun=0;newRun();player.inv=999;}};requestAnimationFrame(frame);\n})();`;
   const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',hook);
   await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
   await page.goto('file:///C:/Games/KillMe2/index.html');await page.locator('#startButton').click();
   const before=await page.evaluate(()=>arenaQA.state());await page.evaluate(()=>arenaQA.move());await page.waitForTimeout(800);await page.evaluate(()=>arenaQA.stop());
   const after=await page.evaluate(()=>arenaQA.state());assert.ok(after.x>before.x+90);assert.ok(after.camera.x>before.camera.x+60,'camera follows on both devices');assert.equal(after.W,2800);assert.equal(after.H,2200);
   await page.setViewportSize({width:size.height,height:size.width});const rotated=await page.evaluate(()=>arenaQA.state());assert.ok(Math.abs(rotated.x-after.x)<5,'rotation preserves world position');await page.setViewportSize({width:size.width,height:size.height});
   const panels=await page.locator('.hud-left,.wave-panel,.score-panel,header,.abilities').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,r:b.right,b:b.bottom};}));for(const p of panels){assert.ok(p.x>=0&&p.y>=0&&p.r<=size.width+1&&p.b<=size.height+1,'HUD fits viewport');}
   const count=await page.evaluate(()=>arenaQA.crowd());assert.ok(count>=300&&count<=600,'late waves support hundreds of enemies');
   await page.evaluate(()=>arenaQA.mission());await page.screenshot({path:'tests/arena-'+size.width+'.png'});assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS: portrait, landscape and desktop scrolling, stable world on rotation, HUD bounds, 360-enemy cap and campaign rendering.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
