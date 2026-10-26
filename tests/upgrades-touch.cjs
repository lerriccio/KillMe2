const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const [width,height] of [[390,844],[320,568],[844,390],[667,375]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const source=fs.readFileSync('game.js','utf8').replace('requestAnimationFrame(frame);\n})();',`window.touchQA={show(){player.inv=999;pendingUpgrades=1;chooseUpgrade();},state:()=>({mode,x:player.x,dash:player.dashCd,nova:player.novaCd,stick:{...stick},pending:pendingUpgrades})};requestAnimationFrame(frame);\n})();`);
   await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
   await page.goto('file:///C:/Games/KillMe2/index.html');await page.locator('#startButton').tap();
   const cdp=await context.newCDPSession(page);
   const center=async(selector,id)=>{const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2,id};};
   const origin=await center('#joystick',1),moved={...origin,x:origin.x+30};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moved]});
   await page.evaluate(()=>touchQA.show());
   const boxes=await Promise.all(['#upgradePanel','.abilities','#joystick'].map(s=>page.locator(s).boundingBox()));
   const [panel,abilities,stick]=boxes;
   const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
   assert.ok(!overlaps(panel,abilities),'rewards leave abilities clear '+width);
   assert.ok(!overlaps(panel,stick),'rewards leave joystick clear '+width);
   assert.ok(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);
   for(const [selector,key] of [['#dashButton','dash'],['#novaButton','nova']]){
    const before=await page.evaluate(()=>touchQA.state());const finger=await center(selector,2);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moved,finger]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger]});
    await page.waitForTimeout(80);const after=await page.evaluate(()=>touchQA.state());
    assert.ok(after[key]>0,selector+' fires with rewards and joystick held');assert.ok(after.stick.x>0&&after.x>before.x,JSON.stringify({width,selector,before,after}));
   }
   await page.locator('#upgradeChoices button:first-child').scrollIntoViewIfNeeded();
   const reward=await center('#upgradeChoices button:first-child',3);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moved,reward]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[reward]});
   const selected=await page.evaluate(()=>touchQA.state());assert.equal(selected.pending,0);assert.ok(selected.stick.x>0);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: rewards avoid abilities and joystick; moving + dash + super + reward selection with real multitouch at 390, 320, 844 and 667px.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
