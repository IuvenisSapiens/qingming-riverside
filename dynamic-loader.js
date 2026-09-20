(() => {
  'use strict';
  const scripts=[
    'world.js?v=8.2','bridge-railing.js?v=1','night.js?v=1.3','weather.js?v=10.5',
    'sound.js?v=10.5','water.js?v=1.3','movement.js?v=7.5','population.js?v=6.4',
    'street-life.js?v=9.1','street-details.js?v=8.1','bridge-event.js?v=9.2',
    'bridge-art.js?v=9.2','people-frames.js','people-masks.js','wardrobe.js?v=5.2.1',
    'inhabitants.js?v=10.9','featured-characters.js?v=7.4','districts.js?v=5.6'
  ];
  let loading=null;
  let warmed=false;
  function warm(){
    if(warmed)return;warmed=true;
    for(const src of ['assets/street-empty.webp','assets/district-west.webp','assets/district-east.webp',
      'assets/people-ink.png','assets/featured-characters-v7.png','assets/boat.png']){
      const link=document.createElement('link');link.rel='preload';link.as='image';link.href=src;document.head.append(link);
    }
    for(const src of ['scene.js?v=14.2','water-three.js?v=1.6','vendor/three.module.js','vendor/three.core.js']){
      const link=document.createElement('link');link.rel='modulepreload';link.href=src;document.head.append(link);
    }
  }

  function add(src,module=false){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;script.async=false;
      if(module)script.type='module';script.onload=resolve;script.onerror=()=>reject(new Error(`Failed to load ${src}`));
      document.body.append(script);
    });
  }

  window.loadQingmingScene=()=>{
    if(document.body.classList.contains('ready'))return Promise.resolve();
    if(loading)return loading;
    loading=(async()=>{
      warm();
      // async=false preserves insertion/execution order while every request
      // is in flight together, rather than paying one round trip per script.
      await Promise.all(scripts.map(src=>add(src)));
      const ready=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Scene loading timed out')),30000);
        addEventListener('atlas-ready',()=>{clearTimeout(timer);resolve();},{once:true});
        addEventListener('atlas-error',()=>{clearTimeout(timer);reject(new Error('Scene assets failed to load'));},{once:true});
      });
      await add('scene.js?v=14.2',true);await ready;
    })().catch(error=>{loading=null;throw error;});
    return loading;
  };
  const prepare=()=>{
    if(navigator.connection?.saveData)return;
    const start=()=>{window.loadQingmingScene().catch(()=>{});};
    if(window.requestIdleCallback)requestIdleCallback(start,{timeout:1500});
    else setTimeout(start,300);
  };
  if(document.readyState==='complete')prepare();
  else window.addEventListener('load',prepare,{once:true});
})();
