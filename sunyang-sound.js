(() => {
  'use strict';
  let context,master,clickBus,noise,enabled=true;
  const music=new Audio('assets/sunyang-music.mp3');
  music.loop=true;music.volume=.4;music.preload='auto';

  function ready(){
    if(context)return context;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return null;
    context=new AudioContext();master=context.createGain();master.gain.value=.82;master.connect(context.destination);
    clickBus=context.createGain();clickBus.connect(master);
    noise=context.createBuffer(1,Math.ceil(context.sampleRate*.04),context.sampleRate);
    const samples=noise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/context.sampleRate*135);
    return context;
  }
  function resume(){const c=ready();if(c?.state==='suspended')void c.resume();return c;}
  function tap({bright=false}={}){
    const c=resume();if(!c)return;
    const t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=noise;filter.type='bandpass';filter.frequency.value=bright?2600:1450;filter.Q.value=bright?1.25:.8;
    gain.gain.setValueAtTime(bright?.075:.055,t);gain.gain.exponentialRampToValueAtTime(.001,t+.037);
    source.connect(filter).connect(gain).connect(clickBus);source.start(t);source.stop(t+.039);
    if(bright)pluck(880,t+.012,.12,.026,clickBus);
  }
  function pluck(hz,t,duration,volume,bus=clickBus){
    const c=context,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
    osc.type='triangle';osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(hz*.995,t+duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(3000,t);filter.frequency.exponentialRampToValueAtTime(950,t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(filter).connect(gain).connect(bus);osc.start(t);osc.stop(t+duration+.01);
  }
  function setEnabled(value){
    enabled=value;
    const button=document.querySelector('#musicToggle');
    if(button){button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'关闭店内音乐':'开启店内音乐');button.textContent=value?'音乐开':'音乐关';}
    if(value)start();else music.pause();
  }
  function start(){
    if(!enabled||document.hidden||!music.paused)return;
    // Browsers may defer playback until the first interaction inside the shop.
    music.play().catch(()=>{});
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)music.pause();else start();
  });
  window.addEventListener('pagehide',()=>music.pause());
  window.addEventListener('pageshow',start);
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#musicToggle'))start();});
  document.addEventListener('keydown',e=>{if(!e.target.closest('#musicToggle'))start();});
  window.SunyangSound={click:()=>tap(),select:()=>tap({bright:true}),start,toggle:()=>setEnabled(!enabled)};
  start();
})();
