const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file:///C:/Games/KillMe2/index.html');
  await page.locator('#settingsButton').click();await page.locator('#creditsButton').click();
  const dialog=page.locator('#creditsDialog');
  assert.equal(await dialog.evaluate(d=>d.open),true);
  const content=await dialog.innerText();
  for(const text of ['Lerriccio','Codex','Kevin MacLeod','Mega Hyper Ultrastorm','Blown Away','Furious Freak','Club Diver','CC BY 4.0','Kenney','CC0','Arcade Pixel'])assert.ok(content.includes(text),text);
  const catalog=[...require('../soundtrack-preview-2/tracks.json'),...require('../soundtrack-preview-3/tracks.json')];
  for(const title of ['Mega Hyper Ultrastorm','Blown Away','Furious Freak','Club Diver'])assert.equal(await dialog.getByRole('link',{name:title,exact:true}).getAttribute('href'),catalog.find(t=>t.title===title).source);
  await page.screenshot({path:'tests/credits-desktop.png'});
  await page.keyboard.press('Escape');
  assert.equal(await dialog.evaluate(d=>d.open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'creditsButton');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#creditsButton').click();
  assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth));
  await page.screenshot({path:'tests/credits-mobile.png'});
  await page.locator('#closeCreditsButton').click();
  assert.equal(await dialog.evaluate(d=>d.open),false);
  await page.locator('#closeSettingsButton').click();
  await page.locator('#startButton').click();
  assert.equal(await page.locator('#hud').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: creator, assistant and asset credits, exact music sources, desktop/mobile dialog, Esc and button close, focus restoration, game start.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
