const fs=require('node:fs'),cp=require('node:child_process');
const browser=process.argv.includes('--browser');
const names=fs.readdirSync('tests').filter(n=>n.endsWith('.cjs')&&fs.readFileSync('tests/'+n,'utf8').includes('chromium')===browser);
let failures=0;for(const name of names){const result=cp.spawnSync(process.execPath,['tests/'+name],{encoding:'utf8',timeout:180000});console.log(name+': '+(result.status===0?'PASS':'FAIL'));if(result.status!==0){failures++;console.log((result.stdout||'')+(result.stderr||'')+(result.error||''));}}
console.log(names.length+' '+(browser?'browser':'simulation')+' suites, '+failures+' failures.');process.exitCode=failures?1:0;
