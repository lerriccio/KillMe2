const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.campaignQA={win:()=>endRun(true),state:()=>({mode,campaignRun,completed:campaignSave.completed,hero:selectedHero})};requestAnimationFrame(frame);\n})();`);
  await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto('file:///C:/Games/KillMe2/index.html');
  await page.evaluate(()=>localStorage.removeItem('killme2-campaign-v1'));await page.reload();
  assert.equal(await page.title(),'KillMe2');
  await page.locator('#campaignButton').click();await page.locator('#comicArt').waitFor({state:'visible'});await page.locator('#comicLoadStatus').waitFor({state:'hidden'});
  await page.screenshot({path:'tests/campaign-comic.png'});
  for(let i=0;i<3;i++)await page.locator('#comicNext').click();await page.locator('#comicPrevious').click();assert.match(await page.locator('#comicCounter').innerText(),/3 DI 4/);await page.locator('#comicNext').click();await page.locator('#comicNext').click();
  assert.equal(await page.locator('.mission-node:enabled').count(),1);
  await page.screenshot({path:'tests/campaign-map.png'});
  for(let i=0;i<5;i++){
   await page.locator('#campaignHeroes button').nth(i%4).click();await page.locator('.mission-node').nth(i).click();await page.locator('#continueButton').click();
   await page.locator('#missionObjective').waitFor({state:'visible'});assert.equal((await page.evaluate(()=>campaignQA.state())).campaignRun,i);
   await page.locator('#pauseButton').click();assert.equal((await page.evaluate(()=>campaignQA.state())).mode,'pause');await page.locator('#continueButton').click();
   await page.evaluate(()=>campaignQA.win());await page.locator('#continueButton').click();
  }
  await page.locator('#comicLoadStatus').waitFor({state:'hidden'});
  assert.equal(await page.locator('#comicArt').evaluate(c=>c.width>=384&&c.height>=256),true,'ending artwork was decoded and painted');
  await page.locator('#comicNext').click();await page.locator('#comicLoadStatus').waitFor({state:'hidden'});await page.screenshot({path:'tests/campaign-ending.png'});
  await page.locator('#comicSkip').click();assert.equal(await page.locator('#replayEnding').isVisible(),true);
  await page.reload();await page.locator('#campaignButton').click();assert.equal(await page.locator('.mission-node:enabled').count(),6,'completed missions and the next chapter persist after reload');
  for(const size of [{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
   await page.setViewportSize(size);await page.locator('#replayIntro').click();
   const bounds=await page.locator('#comicScreen').boundingBox();assert.ok(bounds.y>=60&&bounds.x>=0&&bounds.x+bounds.width<=size.width);
   assert.equal(await page.locator('#comicScreen').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'comic fits narrow viewports');
   if(size.width===390)await page.screenshot({path:'tests/campaign-mobile.png'});
   await page.locator('#comicSkip').click();assert.equal(await page.locator('#campaignMap').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'map fits viewport');
  }
  await page.locator('#mapHome').click();await page.locator('#startButton').click();assert.equal((await page.evaluate(()=>campaignQA.state())).campaignRun,null);
  assert.deepEqual(errors,[]);console.log('PASS: real browser comic navigation, map, all mission launches, four heroes, pause, ending, persistent saves, Arcade, mobile and landscape layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
