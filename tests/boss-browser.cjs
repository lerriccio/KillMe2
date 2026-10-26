const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.bossQA={state:()=>({bossMode,wave,count:enemies.length,bosses:enemies.filter(e=>e.type==='boss').length}),crowd(){player.inv=999;player.damage=0;shootTimer=999;for(let i=0;i<600;i++)update(.016);draw();}};requestAnimationFrame(frame);\n})();`);
  await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));await page.goto('file:///C:/Games/KillMe2/index.html');
  await page.locator('#bossButton').scrollIntoViewIfNeeded();const bounds=await page.locator('#bossButton').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);await page.screenshot({path:'tests/boss-menu-'+width+'.png'});
  await page.locator('#bossButton').click();await page.waitForTimeout(150);let state=await page.evaluate(()=>bossQA.state());assert.equal(state.bossMode,true);assert.equal(state.bosses,1);await page.evaluate(()=>bossQA.crowd());state=await page.evaluate(()=>bossQA.state());assert.equal(state.count,1000);assert.equal(state.bosses,1);assert.ok((await page.locator('#waveText').textContent()).includes('∞'));await page.screenshot({path:'tests/boss-horde-'+width+'.png'});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: Boss menu and 700-enemy combat in desktop and touch Edge, HUD and no browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
