const fs=require('node:fs'),path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(__dirname,'../.tools/playwright');
const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'store/assets');fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 let portrait;
 for(const language of ['it','en']){
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(lang=>{localStorage.setItem('killme2-language',lang);localStorage.setItem('killme2-settings-v1',JSON.stringify({musicVolume:0,sfxVolume:0,audio:false,shake:false}));},language);
  for(let scene=0;scene<3;scene++){
   await page.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));await page.evaluate(()=>document.fonts.ready);
   if(!portrait)portrait=await page.locator('.hero-card canvas').first().evaluate(c=>c.toDataURL());
   await page.locator('.hero-card').nth([2,3,1][scene]).click();await page.locator('#arenaSelect').selectOption(String(scene));await page.locator(scene===2?'#startButton':'#bossButton').click();
   await page.keyboard.down('KeyD');await page.waitForTimeout(1100);await page.keyboard.press('KeyE');await page.keyboard.press('Space');await page.keyboard.up('KeyD');await page.keyboard.down('KeyW');await page.waitForTimeout(1100);await page.keyboard.up('KeyW');await page.keyboard.down('KeyA');await page.waitForTimeout(1000);await page.keyboard.up('KeyA');
   if(!await page.locator('#overlay').isHidden())throw Error('Capture ended before screenshot; rebalance capture path');
   await page.screenshot({path:path.join(out,language+'-gameplay-'+(scene+1)+'.png')});
  }
  if(errors.length)throw Error(errors.join('\n'));await context.close();console.log('Captured three real '+language+' gameplay screenshots.');
 }
 const graphics=await browser.newPage({viewport:{width:1024,height:500}});await graphics.goto('about:blank');
 const icon=await graphics.evaluate(async portrait=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#141d35';x.fillRect(0,0,512,512);x.fillStyle='#24344d';for(let j=0;j<512;j+=32)for(let i=0;i<512;i+=32)if((i+j)%64===0)x.fillRect(i,j,28,28);x.fillStyle='#ffcd65';x.fillRect(48,52,416,20);x.fillRect(48,440,416,20);const im=new Image();im.src=portrait;await im.decode();x.imageSmoothingEnabled=false;x.drawImage(im,30,0,250,240,0,12,512,492);return c.toDataURL().split(',')[1];},portrait);fs.writeFileSync(path.join(out,'icon-512.png'),Buffer.from(icon,'base64'));
 const image='data:image/png;base64,'+fs.readFileSync(path.join(out,'en-gameplay-1.png')).toString('base64');
 for(const lang of ['it','en']){const bytes=await graphics.evaluate(async({image,lang})=>{const c=document.createElement('canvas');c.width=1024;c.height=500;const x=c.getContext('2d',{alpha:false});const im=new Image();im.src=image;await im.decode();x.drawImage(im,0,0,1024,500);const g=x.createLinearGradient(0,0,1024,0);g.addColorStop(0,'#101426');g.addColorStop(.48,'#101426ed');g.addColorStop(1,'#10142622');x.fillStyle=g;x.fillRect(0,0,1024,500);x.fillStyle='#72e3ed';x.font='bold 24px sans-serif';x.fillText('FORGE SURVIVORS',60,112);x.fillStyle='#fff0dc';x.font='bold 56px sans-serif';x.fillText(lang==='it'?'QUATTRO EROI.':'FOUR HEROES.',60,194);x.fillText(lang==='it'?'ORDE INFINITE.':'ENDLESS HORDES.',60,258);x.font='24px sans-serif';x.fillStyle='#ffcd65';x.fillText(lang==='it'?'Scegli. Combatti. Torna più forte.':'Choose. Fight. Return stronger.',60,330);x.font='bold 30px sans-serif';x.fillStyle='#fff0dc';x.fillText('KILLME2',60,416);return c.toDataURL().split(',')[1];},{image,lang});fs.writeFileSync(path.join(out,lang+'-feature-1024x500.png'),Buffer.from(bytes,'base64'));}
 // Google Play requires feature graphics as 24-bit RGB, without an alpha channel.
 for(const lang of ['it','en']){const file=path.join(out,lang+'-feature-1024x500.png'),url='data:image/png;base64,'+fs.readFileSync(file).toString('base64');await graphics.setContent('<style>html,body{margin:0;width:1024px;height:500px;overflow:hidden}img{display:block;width:1024px;height:500px}</style><img src="'+url+'">');await graphics.locator('img').evaluate(im=>im.decode());await graphics.screenshot({path:file,omitBackground:false});}
 await graphics.close();
 const videoContext=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await videoContext.newPage();await page.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));await page.locator('.hero-card').nth(2).click();await page.locator('#bossButton').click();
 for(const key of ['KeyD','KeyW','KeyA','KeyS','KeyD','KeyW']){await page.keyboard.down(key);await page.keyboard.press('Space');await page.keyboard.press('KeyE');await page.waitForTimeout(1800);await page.keyboard.up(key);}
 const video=page.video();await videoContext.close();await video.saveAs(path.join(out,'gameplay-preview.webm'));await video.delete();console.log('Created icon, IT/EN feature graphics and unmodified gameplay video (silent).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
