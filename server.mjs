import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorized, roomName, eventPayload } from './api/events.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const pin = process.env.PORTRAIT_PIN || 'haunt2026';
const rooms = new Map();
const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };
function respond(res,status,content,contentType='application/json') { res.writeHead(status,{ 'Content-Type':`${contentType}; charset=utf-8`, 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(contentType==='application/json'?JSON.stringify(content):content); }
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,`http://localhost:${port}`);
    if(url.pathname==='/api/events'){
      if(!authorized(req.headers['x-portrait-pin'],pin)) return respond(res,401,{error:'Incorrect private PIN.'});
      if(!['GET','POST'].includes(req.method)) return respond(res,405,{error:'Method not allowed.'});
      if(req.method==='GET'){
        const room=roomName(url.searchParams.get('room'));
        const data=rooms.get(room)||{id:0,events:[]};
        if(url.searchParams.get('init')==='1') return respond(res,200,{events:[],lastId:data.id});
        const since=Math.max(0,Number(url.searchParams.get('since'))||0);
        const events=data.events.filter(e=>e.id>since);
        return respond(res,200,{events,lastId:events.at(-1)?.id||since});
      }
      let text='';
      for await(const part of req){text+=part;if(text.length>500000) return respond(res,413,{error:'Request too large.'});}
      const body=JSON.parse(text);
      const room=roomName(body.room);
      const event=eventPayload(body);
      const data=rooms.get(room)||{id:0,events:[]};
      const queued={...event,id:++data.id,at:Date.now()};
      data.events.push(queued); data.events=data.events.slice(-120);rooms.set(room,data);
      return respond(res,200,{ok:true,id:queued.id});
    }
    const pathname=decodeURIComponent(url.pathname);
    const requested=pathname==='/'?'/index.html':pathname;
    const file=path.resolve(root, `.${requested}`);
    if(!file.startsWith(root+path.sep)||file.includes(`${path.sep}api${path.sep}`)||file.includes(`${path.sep}tests${path.sep}`)||file.includes(`${path.sep}.env`)) return respond(res,403,{error:'Forbidden.'});
    const data=await fs.readFile(file);
    respond(res,200,data,mime[path.extname(file)]||'application/octet-stream');
  }catch(e){respond(res,e.code==='ENOENT'?404:400,{error:e.message||'Request failed.'});}
}).listen(port,()=>console.log(`Haunted Portrait: http://localhost:${port}\nLocal demo PIN: ${pin}\nOn Vercel, set PORTRAIT_PIN and connect Upstash Redis.`));
