const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

// Optional baseline: node tests/mobile-performance.cjs tests/mobile-perf-baseline.bak
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const results=[];
  for(const file of [...process.argv.slice(2),'game.js']){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   const source=fs.readFileSync(file,'utf8').replace('requestAnimationFrame(frame);\n})();',`window.perfQA={
    setup(){music.enabled=false;newRun();stopMusic();enemies=[];spawnTimer=eliteTimer=shootTimer=1000;player.inv=1000;player.magnet=0;
     for(let i=0;i<260;i++){spawn(['normal','runner','tank','shooter'][i%4]);const e=enemies[i];e.x=25+i*37%340;e.y=140+i*53%620;e.speed=0;e.cd=1000;e.hp=e.maxHp=1e9;}
     gems=Array.from({length:350},(_,i)=>({x:20+i*23%350,y:130+i*41%650,value:1,age:0}));
     for(let i=0;i<64;i++)bullets.push({x:25+i*37%340,y:140+i*53%620,vx:0,vy:0,life:1000,pierce:1000,hit:new Set(),kind:'gunslinger'});
     burst(195,420,'#ffcd65',1100);for(let i=0;i<50;i++)ring(195,420,'#ffcd65');
    },step(){update(1/60);draw();},draw,
    spriteCheck(){const previous=ctx;const actual=document.createElement('canvas');actual.width=actual.height=200;ctx=actual.getContext('2d');ctx.imageSmoothingEnabled=false;
     const expected=document.createElement('canvas');expected.width=expected.height=200;const reference=expected.getContext('2d');const colors={'0':'#101426','2':'#a44968','3':'#f5879b','4':'#fff0c4','5':'#ffd477','6':'#35415e'};
     try{for(const rows of Object.values(enemyMaps))for(const p of [1,2,3,7])for(const flip of [false,true]){
      ctx.clearRect(0,0,200,200);reference.clearRect(0,0,200,200);sprite(rows,100,100,p,colors,flip);
      const left=Math.round(100/p)*p-Math.floor(rows[0].length/2)*p,top=Math.round(100/p)*p-Math.floor(rows.length/2)*p;
      for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){const color=colors[rows[r][c]];if(color){reference.fillStyle=color;reference.fillRect(left+(flip?rows[0].length-1-c:c)*p,top+r*p,p,p);}}
      const a=ctx.getImageData(0,0,200,200).data,b=reference.getImageData(0,0,200,200).data;if(a.some((v,i)=>v!==b[i]))return false;
     }return true;}finally{ctx=previous;}
    },state:()=>({particles:particles.length,rings:rings.length,textWidth:textCanvas.width})};\n})();`);
   await page.route(/game\.js/,r=>r.fulfill({contentType:'application/javascript',body:source}));
   await page.goto('file:///C:/Games/KillMe2/index.html');
   assert.equal(await page.evaluate(()=>perfQA.spriteCheck()),true,'cached sprite pixels match original, including flips and scales');
   await page.evaluate(()=>perfQA.setup());
   const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   const metrics=await page.evaluate(()=>{
    for(let i=0;i<30;i++)perfQA.step();
    let fills=0,images=0;const proto=CanvasRenderingContext2D.prototype,fill=proto.fillRect,image=proto.drawImage;
    proto.fillRect=function(...args){fills++;return fill.apply(this,args);};proto.drawImage=function(...args){images++;return image.apply(this,args);};
    const times=[];for(let i=0;i<120;i++){const start=performance.now();perfQA.step();times.push(performance.now()-start);}
    proto.fillRect=fill;proto.drawImage=image;times.sort((a,b)=>a-b);
    return {medianMs:times[60],p95Ms:times[114],fillsPerFrame:fills/120,imagesPerFrame:images/120,...perfQA.state()};
   });
   if(file==='game.js'){
    assert.ok(metrics.fillsPerFrame<6000,'sprite rendering stays bounded under crowd load');
    assert.ok(metrics.particles<=240&&metrics.rings<=32,'touch effects stay bounded');
    assert.equal(metrics.textWidth,390,'touch text canvas avoids DPR 3 overdraw');
    await page.screenshot({path:'tests/performance-mobile.png'});
   }
   assert.deepEqual(errors,[]);results.push({file,...metrics});await context.close();
  }
  console.log(JSON.stringify(results,null,2));
  if(results.length===2)assert.ok(results[1].fillsPerFrame<results[0].fillsPerFrame*.3,'crowded scene cuts canvas fill calls by at least 70%');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
