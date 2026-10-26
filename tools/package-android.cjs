const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),target=path.join(root,'android/app/src/main/assets/game');
const files=['index.html','style.css','game.js','release.js','i18n.js','assets/arcade-pixel.ttf','assets/comics/chapter-01-intro-8bit.png','assets/comics/chapter-01-ending-8bit.png','assets/audio/CREDITS.md','MUSIC-LICENSE-NOTES.md','soundtrack-preview-2/CREDITS.md','soundtrack-preview-3/CREDITS.md','soundtrack-preview-2/01-mega-hyper-ultrastorm.mp3','soundtrack-preview-2/05-blown-away.mp3','soundtrack-preview-2/10-furious-freak.mp3','soundtrack-preview-3/05-club-diver.mp3'];
for(const name of ['laserSmall_000','laserLarge_000','laserRetro_003','impactMetal_000','forceField_000','lowFrequency_explosion_000','explosionCrunch_000','forceField_004','laserRetro_001','forceField_002'])files.push('assets/audio/kenney/Audio/'+name+'.ogg');
// Never recursively delete an inferred directory: remove only stale files inside this exact asset root.
fs.mkdirSync(target,{recursive:true});
const allowed=new Set(files.map(f=>path.resolve(target,f)));
function clean(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected asset symlink');if(e.isDirectory())clean(file);else if(!allowed.has(file))fs.unlinkSync(file);}}
clean(target);
let size=0;const manifest=[];
for(const file of files){const from=path.join(root,file),to=path.join(target,file),bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);size+=bytes.length;manifest.push({file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.mkdirSync(path.join(root,'release-build'),{recursive:true});fs.writeFileSync(path.join(root,'release-build/asset-manifest.json'),JSON.stringify(manifest,null,2));console.log('Packaged '+files.length+' offline assets, '+(size/1048576).toFixed(1)+' MiB.');
