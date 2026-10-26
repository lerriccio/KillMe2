const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8').replace('requestAnimationFrame(frame);\n})();',`globalThis.upgradeQA={
 show(){preferences.upgradeTimer=true;pendingUpgrades=1;player.ranks.core=1;rollUpgrades=()=>[upgrades.find(u=>u.id==='core'),upgrades.find(u=>u.id==='cryo'),upgrades.find(u=>u.id==='chain')];chooseUpgrade();},
 state:()=>({ranks:player.ranks,mode,runTime,x:player.x,remaining:activeUpgrade?.remaining,pending:pendingUpgrades}),tick:dt=>tickUpgrade(dt),queue:()=>pendingUpgrades++,safe:()=>{player.inv=1000;}
};requestAnimationFrame(frame);\n})();`);
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ogg')?'audio/ogg':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(file===path.join(root,'game.js')?source:fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#startButton').click();
 await page.locator('#dashButton').click();await page.waitForFunction(()=>document.getElementById('dashButton').disabled);
 await page.locator('#novaButton').click();await page.waitForFunction(()=>document.getElementById('novaButton').disabled);
 await page.evaluate(()=>{upgradeQA.safe();upgradeQA.show();});
 const initial=await page.evaluate(()=>upgradeQA.state());
 await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');
 const moving=await page.evaluate(()=>upgradeQA.state());
 assert.equal(moving.mode,'play');assert.ok(moving.runTime>initial.runTime);assert.ok(moving.x>initial.x);assert.ok(moving.remaining<10);
 assert.ok(await page.locator('#overlay').isHidden());
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>upgradeQA.state());await page.waitForTimeout(200);
 assert.equal((await page.evaluate(()=>upgradeQA.state())).remaining,paused.remaining);assert.ok(await page.locator('#upgradePanel').isHidden());
 await page.keyboard.press('Escape');assert.ok(await page.locator('#upgradePanel').isVisible());
 assert.equal(await page.locator('.upgrade').count(),3);assert.match(await page.locator('.upgrade').first().innerText(),/GRADO 1 .* 2/);
 await page.screenshot({path:path.join(__dirname,'upgrades-desktop.png')});
 await page.locator('.upgrade').first().click();assert.equal(await page.evaluate(()=>upgradeQA.state().ranks.core),2);assert.ok(await page.locator('#overlay').isHidden());
 await page.evaluate(()=>upgradeQA.show());await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 for(const card of await page.locator('.upgrade').all()){await card.scrollIntoViewIfNeeded();assert.ok(await card.isVisible());const box=await card.boundingBox();assert.ok(box.width<=390&&box.x>=0);}
 await page.screenshot({path:path.join(__dirname,'upgrades-mobile.png')});
 await page.locator('.upgrade').last().click();assert.equal(await page.evaluate(()=>upgradeQA.state().ranks.chain),1);
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>upgradeQA.show());await page.keyboard.press('Digit2');assert.equal(await page.evaluate(()=>upgradeQA.state().ranks.cryo),1);
 await page.evaluate(()=>{upgradeQA.show();upgradeQA.queue();upgradeQA.tick(9.9);});
 assert.ok((await page.evaluate(()=>upgradeQA.state())).remaining>0);
 await page.evaluate(()=>upgradeQA.tick(.1));assert.equal(await page.evaluate(()=>upgradeQA.state().pending),1);
 assert.ok((await page.evaluate(()=>upgradeQA.state().remaining))>9.8);
 await page.evaluate(()=>upgradeQA.tick(10));assert.equal(await page.evaluate(()=>upgradeQA.state().pending),0);assert.ok(await page.locator('#upgradePanel').isHidden());
 assert.deepEqual(errors,[]);console.log('PASS: non-blocking rewards, movement, pause/resume, 10-second automatic selection, queued levels, keyboard and mouse selection, desktop/mobile layout, no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
