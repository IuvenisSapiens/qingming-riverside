(() => {
  'use strict';
  const scripts=[
    'world.js?v=8.2','bridge-railing.js?v=1','night.js?v=1.3','weather.js?v=10.5',
    'sound.js?v=10.5','water.js?v=1.3','movement.js?v=7.3','population.js?v=6.3',
    'street-life.js?v=9.1','street-details.js?v=8.1','bridge-event.js?v=9.2',
    'bridge-art.js?v=9.2','people-frames.js','people-masks.js','wardrobe.js?v=5.2.1',
    'inhabitants.js?v=10.6','featured-characters.js?v=7.3','districts.js?v=5.4'
  ];
  let loading=null;

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
      for(const src of scripts)await add(src);
      const ready=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Scene loading timed out')),30000);
        addEventListener('atlas-ready',()=>{clearTimeout(timer);resolve();},{once:true});
        addEventListener('atlas-error',()=>{clearTimeout(timer);reject(new Error('Scene assets failed to load'));},{once:true});
      });
      await add('scene.js?v=14',true);await ready;
    })().catch(error=>{loading=null;throw error;});
    return loading;
  };
})();
