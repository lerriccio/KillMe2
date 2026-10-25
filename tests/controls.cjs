const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.controlsQA={state:()=>({mode,hero:selectedHero,dash:player?.dashCd,nova:player?.novaCd,keys:{...keys},audio:music.enabled}),upgrade:()=>{pendingUpgrades=1;chooseUpgrade();},end:()=>endRun(false)};requestAnimationFrame(frame);\n})();`);
  await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
  await page.goto('file:///C:/Games/KillMe2/index.html');
  const state=()=>page.evaluate(()=>controlsQA.state());
  const fits=async(selector)=>{
   const boxes=await page.locator(selector).evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect();return {id:e.id,x:b.x,y:b.y,right:b.right,bottom:b.bottom,w:b.width,h:b.height};}));
   const {width,height}=page.viewportSize();
   for(const b of boxes){assert.ok(b.x>=0&&b.right<=width&&b.y>=0&&b.bottom<=height,JSON.stringify(b));assert.ok(b.w>=44&&b.h>=44,'hit area '+b.id);}
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'overlap: '+a.id+' / '+b.id);
   }
  };
  assert.equal(await page.locator('#pauseButton').isVisible(),false);
  await page.locator('.hero-card').nth(2).focus();await page.keyboard.press('Space');
  assert.equal((await state()).hero,2,'Space selects hero in menu');
  await page.locator('#arenaSelect').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#arenaSelect').inputValue(),'1');
  await page.locator('#creditsButton').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#creditsDialog').evaluate(e=>e.open),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'creditsButton');
  await page.keyboard.press('KeyM');assert.equal((await state()).audio,false);
  assert.equal(await page.locator('#muteButton').getAttribute('aria-pressed'),'false');
  await page.keyboard.press('KeyM');assert.equal((await state()).audio,true);
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>!!document.fullscreenElement);
  assert.match(await page.locator('#fullscreenLabel').innerText(),/ESCI/);
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>!document.fullscreenElement);
  await page.locator('#startButton').focus();await page.keyboard.press('Space');
  assert.equal((await state()).mode,'play','Space starts game');
  assert.equal((await state()).dash,0,'start does not fire dash');
  await page.locator('.wordmark').click();assert.equal((await state()).mode,'menu','logo returns to menu without reloading');
  await page.locator('#startButton').click();
  await page.locator('#pauseButton').focus();await page.keyboard.press('Space');
  assert.equal((await state()).mode,'play','combat Space does not click focused pause button');
  assert.ok((await state()).dash>0);
  await page.keyboard.press('Escape');assert.equal((await state()).mode,'pause');
  assert.equal(await page.locator('#pauseLabel').innerText(),'RIPRENDI');
  assert.equal(await page.locator('#dashButton').isDisabled(),true);
  await page.keyboard.press('Space');assert.equal((await state()).mode,'play','Space resumes focused dialog action');
  await page.keyboard.press('KeyE');assert.ok((await state()).nova>0);
  await page.keyboard.down('KeyD');await page.keyboard.press('Escape');await page.keyboard.up('KeyD');
  await page.locator('#pauseButton').click();assert.deepEqual((await state()).keys,{});
  await page.evaluate(()=>controlsQA.upgrade());
  assert.equal(await page.locator('#pauseButton').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('upgrade')),true);
  await page.keyboard.press('Space');assert.equal((await state()).mode,'play');
  await page.evaluate(()=>controlsQA.end());await page.keyboard.press('Space');
  assert.equal((await state()).mode,'play','keyboard retry starts a fresh game');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#continueButton').innerText(),'RIPRENDI','retry label resets for pause');
  await page.locator('#homeButton').click();
  for(const viewport of [{width:1440,height:900},{width:900,height:600},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(viewport);await fits('header button');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(viewport.width===1440||viewport.width===320)await page.screenshot({path:'tests/controls-menu-'+viewport.width+'.png',fullPage:true});
   await page.locator('#startButton').click();await fits('header button,.abilities>button');
   await page.keyboard.press('Escape');await fits('#continueButton,#homeButton');
   if(viewport.width===320)await page.screenshot({path:'tests/controls-pause-320.png'});
   await page.locator('#homeButton').click();
  }
  await page.setViewportSize({width:320,height:568});
  await page.locator('#fullscreenButton').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await fits('header button');await page.keyboard.press('KeyF');
  assert.deepEqual(errors,[]);
  console.log('PASS: keyboard menu/hero/arena/credits/start/resume/retry, combat focus, cooldown states, audio shortcut, fullscreen shortcut, upgrade focus, 5 viewport layouts and 320px fullscreen labels.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
