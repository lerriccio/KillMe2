const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
http.createServer((req,res)=>{
  let filename;
  try { filename = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1) || 'index.html'; } catch { res.writeHead(400).end(); return; }
  if (filename !== path.basename(filename)) { res.writeHead(403).end(); return; }
  const file = path.join(__dirname,filename);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  const size = fs.statSync(file).size;
  const headers = {'Content-Type':file.endsWith('.mp3')?'audio/mpeg':file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8','Accept-Ranges':'bytes'};
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (range) {const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else {res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res);}
}).listen(8766,'127.0.0.1',()=>console.log('Ascolto: http://127.0.0.1:8766'));
