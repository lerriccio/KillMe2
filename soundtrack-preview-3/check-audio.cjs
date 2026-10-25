const {chromium}=require('C:/Users/leori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();
  await page.goto('file:///C:/Games/KillMe2/soundtrack-preview-3/index.html');
  const results=await page.evaluate(async()=>{
    const results=[];
    for(const audio of document.querySelectorAll('audio')){
      if(audio.readyState<1)await new Promise((resolve,reject)=>{
        audio.addEventListener('loadedmetadata',resolve,{once:true});
        audio.addEventListener('error',()=>reject(Error(audio.src)),{once:true});
      });
      await audio.play();
      audio.pause();
      results.push({file:audio.src.split('/').pop(),seconds:Math.round(audio.duration)});
    }
    return results;
  });
  console.log(JSON.stringify(results,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

