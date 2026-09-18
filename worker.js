export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/api/visits'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405,{Allow:'POST'});
      const origin=request.headers.get('Origin');
      const cors=origin==='https://xianxie6.github.io'?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
      try{
        const row=await env.DB.prepare(`
          INSERT INTO counters (name, count) VALUES ('site_visits', 1)
          ON CONFLICT(name) DO UPDATE SET count = count + 1
          RETURNING count
        `).first();
        return json({count:Number(row.count)},200,{'Cache-Control':'no-store, max-age=0',...cors});
      }catch(error){
        console.error('Visit counter failed',error);
        return json({error:'Counter unavailable'},503,{'Cache-Control':'no-store, max-age=0',...cors});
      }
    }
    return env.ASSETS.fetch(request);
  }
};

function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'Content-Type':'application/json; charset=utf-8',...headers}
  });
}
