(() => {
  'use strict';
  class InkSound {
    constructor(){this.enabled=false;this.running=true;this.lastStroke=-Infinity;}
    async toggle(){
      try{
        if(!this.context)this.create();
        await this.context.resume();this.enabled=!this.enabled;this.setRunning(this.running);
      }catch{this.enabled=false;}
      return this.enabled;
    }
    create(){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Audio unavailable');
      const c=this.context=new Audio();
      const noise=this.noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=noise.getChannelData(0);
      let brown=0;
      for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.04-.02)/1.015;data[i]=brown*3;}
      this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
      const water=c.createBufferSource();water.buffer=noise;water.loop=true;
      const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=680;
      const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=110;
      this.water=c.createGain();this.water.gain.value=.38;
      water.connect(low);low.connect(high);high.connect(this.water);this.water.connect(this.master);water.start();
      // Independent bright turbulence complements the low river bed.
      const turbulence=c.createBuffer(1,c.sampleRate*8,c.sampleRate);
      const foam=turbulence.getChannelData(0);
      for(let i=0;i<foam.length;i++)foam[i]=Math.random()*2-1;
      const stream=c.createBufferSource();stream.buffer=turbulence;stream.loop=true;
      const streamFilter=c.createBiquadFilter();streamFilter.type='bandpass';streamFilter.frequency.value=950;streamFilter.Q.value=.5;
      this.stream=c.createGain();this.stream.gain.value=.055;
      stream.connect(streamFilter);streamFilter.connect(this.stream);this.stream.connect(this.master);stream.start();
      const fall=c.createBufferSource();fall.buffer=turbulence;fall.loop=true;fall.playbackRate.value=.83;
      const fallLow=c.createBiquadFilter();fallLow.type='lowpass';fallLow.frequency.value=3200;
      const fallHigh=c.createBiquadFilter();fallHigh.type='highpass';fallHigh.frequency.value=160;
      this.waterfall=c.createGain();this.waterfall.gain.value=0;
      this.fallPan=c.createStereoPanner();
      fall.connect(fallLow);fallLow.connect(fallHigh);fallHigh.connect(this.waterfall);
      this.waterfall.connect(this.fallPan);this.fallPan.connect(this.master);fall.start(0,2.7);
      const rain=c.createBufferSource();rain.buffer=noise;rain.loop=true;
      const rainFilter=c.createBiquadFilter();rainFilter.type='bandpass';rainFilter.frequency.value=1850;rainFilter.Q.value=.34;
      this.rain=c.createGain();this.rain.gain.value=0;
      rain.connect(rainFilter);rainFilter.connect(this.rain);this.rain.connect(this.master);rain.start();
    }
    setRunning(running){
      this.running=running;if(!this.context)return;
      this.master.gain.setTargetAtTime(this.enabled&&running ? .32 : 0,this.context.currentTime,.15);
    }
    noisePulse(pan,duration=.6,level=.22){
      if(!this.enabled||!this.running)return;
      const c=this.context,t=c.currentTime,source=c.createBufferSource();source.buffer=this.noise;
      const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.5;
      const gain=c.createGain();gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.12);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
      const stereo=c.createStereoPanner();stereo.pan.value=Math.max(-1,Math.min(1,pan));
      source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);
      source.start(t,Math.random()*2);source.stop(t+duration);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect();};
    }
    splash(x,camera,width){this.noisePulse((x-camera)/width*2-1,.8,.28);}
    clink(){
      if(!this.enabled||!this.running)return;
      const c=this.context,t=c.currentTime;
      for(const [frequency,level] of [[1720,.025],[2810,.008]]){
        const o=c.createOscillator(),g=c.createGain();o.frequency.value=frequency;
        g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.0001,t+.65);
        o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.7);o.onended=()=>{o.disconnect();g.disconnect();};
      }
    }
    street(events,camera,width){
      if(!this.enabled||!this.running)return;
      for(const event of events){
        if(event.x<camera||event.x>camera+width)continue;
        if(event.id==='tea'&&event.stage==='drink'){this.clink();continue;}
        if(!['shelve','handoff','fold','exchange'].includes(event.stage))continue;
        const c=this.context,t=c.currentTime,o=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();
        o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(75,t+.1);
        gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.16);
        pan.pan.value=(event.x-camera)/width*2-1;o.connect(gain);gain.connect(pan);pan.connect(this.master);
        o.start(t);o.stop(t+.18);o.onended=()=>{o.disconnect();gain.disconnect();pan.disconnect();};
      }
    }
    crossing(event,camera,width){
      if(!this.enabled||!this.running||!event.active)return;
      const b=event.vessel();if(b.x<camera-100||b.x>camera+width+100)return;
      const pan=(b.x-camera)/width*2-1;
      if(event.events.includes('guide'))this.noisePulse(pan,.5,.055);
      if(event.stage==='guide'&&event.time-(this.lastBridgeWater??-99)>2.6){this.lastBridgeWater=event.time;this.noisePulse(pan,.85,.08);}
      if(event.tension>.2&&event.time-(this.lastRope??-99)>3.4){
        this.lastRope=event.time;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
        o.type='triangle';o.frequency.setValueAtTime(87,t);o.frequency.linearRampToValueAtTime(63+event.tension*45,t+.25);
        g.gain.setValueAtTime(.009,t);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.4);o.onended=()=>{o.disconnect();g.disconnect();};
      }
      if(event.stage==='approach'&&event.stageTime<.1){this.lastBridgeWater=-99;this.lastRope=-99;}
    }
    weather(sample){
      if(!this.context)return;
      this.rain.gain.setTargetAtTime(this.enabled&&this.running?sample.rain*.72:0,this.context.currentTime,.35);
    }
    update(time,running,ferry,camera,width){
      if(!this.enabled||!running)return;
      const now=this.context.currentTime;
      this.water.gain.setTargetAtTime(.38+Math.sin(time*.47)*.065,now,.5);
      this.stream.gain.setTargetAtTime(.065+Math.sin(time*.73)*.014,now,.5);
      const fallX=-1505.2,halfWidth=Math.max(1,width/2);
      const distance=Math.max(0,Math.abs(fallX-(camera+halfWidth))-halfWidth);
      const proximity=Math.exp(-distance/380);
      this.waterfall.gain.setTargetAtTime(proximity*(.25+Math.sin(time*.61)*.025),now,.3);
      this.fallPan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(fallX-camera-halfWidth)/halfWidth)),now,.3);
      const rowing=['sailing','approaching','departing','returning'].includes(ferry.mode);
      if(rowing&&ferry.x>camera-90&&ferry.x<camera+width+90&&time-this.lastStroke>2.1){
        this.noisePulse((ferry.x-camera)/width*2-1,.85,.24);this.lastStroke=time;
      }
    }
  }
  window.InkSound=InkSound;
})();
