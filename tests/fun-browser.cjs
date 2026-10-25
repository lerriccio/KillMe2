const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.funTest={setup:()=>{addHeat(100);wave=5;beginWave();for(let i=0;i<20;i++)spawn(i%3?'runner':'tank');for(const [i,kind] of ['heal','magnet','overdrive'].entries())dropLoot(player.x+100+i*60,player.y+70,kind);eliteTimer=0;},state:()=>({mode,furyTime,heat}),expire:()=>furyTime=0};requestAnimationFrame(frame);\n})();`);
  await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto('file:///C:/Games/KillMe2/index.html');await page.locator('#startButton').click();
  await page.evaluate(()=>funTest.setup());await page.waitForTimeout(150);
  assert.match(await page.locator('#furyText').textContent(),/FURIA!/);
  assert.equal(await page.locator('#eventName').textContent(),'ALTA TENSIONE');
  await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>funTest.state())).mode,'pause');
  const frozen=(await page.evaluate(()=>funTest.state())).furyTime;await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>funTest.state())).furyTime,frozen);
  await page.keyboard.press('Escape');await page.screenshot({path:'tests/fury-desktop.png'});
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.screenshot({path:'tests/fury-'+viewport.width+'.png'});
   assert.ok(await page.locator('#furyMeter').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;}));
  }
  await page.evaluate(()=>funTest.expire());await page.waitForTimeout(50);assert.equal(await page.locator('#furyMeter').getAttribute('data-active'),'false');
  assert.deepEqual(errors,[]);console.log('PASS: fury/event HUD, frozen fury during pause, desktop/portrait/landscape rendering, fury expiration and no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
