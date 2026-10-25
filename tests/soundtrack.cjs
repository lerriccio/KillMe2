const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{const create=document.createElement.bind(document);document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='audio')window.testSoundtrack=el;return el;};});
  await page.goto('file:///C:/Games/KillMe2/index.html');
  assert.equal(await page.locator('#trackSelect').count(),0);
  await page.locator('h1').click();
  await page.waitForFunction(()=>testSoundtrack.src.endsWith('05-club-diver.mp3')&&testSoundtrack.currentTime>0&&!testSoundtrack.paused);
  assert.equal(await page.evaluate(()=>testSoundtrack.loop),true);
  await page.locator('#startButton').click();
  await page.waitForFunction(()=>window.testSoundtrack?.currentTime>0);
  assert.equal(await page.evaluate(()=>testSoundtrack.loop),false);
  const expected=['01-mega-hyper-ultrastorm.mp3','05-blown-away.mp3','10-furious-freak.mp3'];
  assert.ok(await page.evaluate(()=>testSoundtrack.src.endsWith('01-mega-hyper-ultrastorm.mp3')));
  for(let i=0;i<3;i++){
   await page.evaluate(()=>new Promise(resolve=>{testSoundtrack.addEventListener('ended',()=>{window.endedAt=performance.now();resolve();},{once:true});testSoundtrack.currentTime=testSoundtrack.duration-.1;}));
   await page.waitForTimeout(1800);
   assert.ok(await page.evaluate(file=>testSoundtrack.src.endsWith(file)&&testSoundtrack.paused,expected[i]));
   const next=expected[(i+1)%3];
   await page.waitForFunction(file=>testSoundtrack.src.endsWith(file)&&testSoundtrack.currentTime>0,next);
   assert.ok(await page.evaluate(()=>performance.now()-window.endedAt>=2400));
  }
  await page.locator('#muteButton').click();
  assert.equal(await page.evaluate(()=>testSoundtrack.muted),true);
  await page.locator('#muteButton').click();
  assert.equal(await page.evaluate(()=>testSoundtrack.muted),false);
  await page.evaluate(()=>new Promise(resolve=>{testSoundtrack.addEventListener('ended',resolve,{once:true});testSoundtrack.currentTime=testSoundtrack.duration-.1;}));
  await page.locator('#pauseButton').click();
  await page.locator('#homeButton').click();
  await page.waitForFunction(()=>testSoundtrack.src.endsWith('05-club-diver.mp3')&&testSoundtrack.currentTime>0&&!testSoundtrack.paused);
  await page.waitForTimeout(2900);
  assert.ok(await page.evaluate(()=>testSoundtrack.src.endsWith('05-club-diver.mp3')));
  await page.locator('#startButton').click();
  await page.waitForFunction(()=>testSoundtrack.currentTime>0&&!testSoundtrack.paused);
  assert.ok(await page.evaluate(()=>testSoundtrack.src.endsWith('05-blown-away.mp3')));
  for(const file of ['10-furious-freak.mp3','01-mega-hyper-ultrastorm.mp3']){
   await page.locator('#pauseButton').click();
   await page.locator('#homeButton').click();
   await page.locator('#startButton').click();
   await page.waitForFunction(file=>testSoundtrack.src.endsWith(file)&&testSoundtrack.currentTime>0,file);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('wild-bunch-next-playlist-start')),'1');
  await page.locator('#pauseButton').click();
  await page.locator('#homeButton').click();
  await page.waitForFunction(()=>testSoundtrack.src.endsWith('05-club-diver.mp3')&&testSoundtrack.currentTime>0);
  assert.equal(await page.evaluate(()=>testSoundtrack.loop),true);
  await page.locator('#muteButton').click();
  assert.equal(await page.evaluate(()=>testSoundtrack.muted),true);
  await page.locator('#muteButton').click();
  assert.equal(await page.evaluate(()=>testSoundtrack.muted),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: playlist order 1-5-10-1, 2.5-second gaps, mute, cancel pending track on menu, removed legacy tracks, rotating match starts 1-5-10-1, saved next start, automatic menu music, removed selector, menu/game transitions, menu mute.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
