(() => {
  'use strict';
  const population=window.ScrollPopulation;
  const movement=window.ScrollMovement;
  class Inhabitants {
    constructor(){
      this.art=new Image();this.ready=false;this.attention=new Map();this.visible=0;this.phaseSample=0;this.outfits=new Map();this.residentFrames=new Map();this.hits=[];this.storyHands=new Map();
      this.art.onload=()=>{this.prepare();this.ready=true;};this.art.src='assets/people-ink.png';
    }
    prepare(){
      this.frames=window.PEOPLE_FRAMES.map((f,index)=>{
        const canvas=document.createElement('canvas');canvas.width=f.w;canvas.height=f.h;
        const c=canvas.getContext('2d');c.translate(-f.x,-f.y);c.beginPath();
        for(const ring of window.PEOPLE_MASKS[index]){ring.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
        c.clip('evenodd');c.drawImage(this.art,0,0);
        c.globalCompositeOperation='multiply';c.fillStyle='#e0d3b5';c.fillRect(f.x,f.y,f.w,f.h);
        c.globalCompositeOperation='destination-out';c.lineWidth=7;c.lineJoin='round';c.stroke();return canvas;
      });
      this.contacts=this.frames.map(c=>movement.footContacts(c.getContext('2d').getImageData(0,0,c.width,c.height).data,c.width,c.height));
      this.motionSurface=document.createElement('canvas');this.motionSurface.width=512;this.motionSurface.height=384;
      // These small surfaces are copied into another canvas repeatedly;
      // keeping their raster in CPU memory avoids GPU readback stalls.
      this.motionContext=this.motionSurface.getContext('2d',{willReadFrequently:true});
      for(const p of [...population.residents,...population.walkers])this.textureFor(p);
    }
    textureFor(p){
      const key=`${p.sprite}:${p.outfit}`;
      if(this.outfits.has(key))return this.outfits.get(key);
      const base=this.frames[p.sprite],f=window.PEOPLE_FRAMES[p.sprite];
      const wardrobe=window.ScrollWardrobe,garment=wardrobe.garments[p.sprite],palette=wardrobe.palettes[p.outfit];
      const texture=document.createElement('canvas');texture.width=base.width;texture.height=base.height;
      const c=texture.getContext('2d');c.drawImage(base,0,0);c.save();c.translate(-f.x,-f.y);
      for(const part of ['upper','lower']){
        c.beginPath();garment[part].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
        c.globalCompositeOperation='color';c.fillStyle=palette[part];c.globalAlpha=1;c.fill();
        c.globalCompositeOperation='multiply';c.globalAlpha=.12;c.fill();
      }
      c.save();c.beginPath();
      for(const [x,y,rx,ry] of wardrobe.protectedParts[p.sprite]){c.moveTo(x+rx,y);c.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
      c.clip();c.globalCompositeOperation='source-over';c.globalAlpha=1;c.drawImage(base,f.x,f.y);c.restore();
      c.restore();c.globalCompositeOperation='destination-in';c.drawImage(base,0,0);
      this.outfits.set(key,texture);return texture;
    }
    react(x,y,time,streetY){
      const p=this.hits.find(hit=>Math.abs(hit.x-x)<20&&y<hit.y+5&&y>hit.y-hit.p.h)?.p;
      if(!p)return false;
      this.attention.set(p.id,time+4);return p;
    }
    draw(ctx,time,range,streetY,walkerAt,fallback,drawFurniture,life=null,afterPerson=null,presence=null){
      this.visible=0;this.hits=[];this.storyHands.clear();
      const residents=[],walkers=[];
      for(const p of population.residents){
        const story=life?.actors[p.x],x=story?.x??p.x;
        if(x<range[0]-60||x>range[1]+60)continue;
        const left=(this.attention.get(p.id)||0)-time;
        if(left<=0)this.attention.delete(p.id);
        const conversation=life&&window.ScrollLife?.conversation(p,time);
        const base=population.residentPose(p,time,left>0?Math.sin(Math.min(left,1)*Math.PI*.5):0);
        const pose={...base,...((p.activity==='talk'||p.activity==='look')?conversation?.pose:{}),...story?.pose};
        if(life&&left>0){
          const elapsed=4-left,envelope=Math.min(1,elapsed*4,left);
          pose.nod+=(Math.sin(elapsed*3.3)*.07)*envelope;
        }
        if(story?.phase!==undefined){pose.phase=story.phase;pose.gaitWeight=story.gaitWeight;}
        const ground=story?.y!==undefined?null:story?.front||p.layer==='bridge'?streetY:null;
        const y=story?.y??(ground?streetY(x):p.y);
        const person=story?{...p,activity:story.activity??p.activity,story:story.story,storyProp:story.prop,originX:p.x}:p;
        const item={p:person,x,y,pose,walking:story?.walking??false,direction:story?.direction??conversation?.direction??p.direction,ground};
        const alpha=presence?.(p,'resident')??1;
        if(alpha>.01)(story?.front?walkers:residents).push({...item,alpha});
        if(alpha>.18)this.hits.push({p,x,y});
      }
      for(const p of population.walkers){
        const pose=walkerAt(p,time);
        if(pose.x<range[0]-65||pose.x>range[1]+65)continue;
        const alpha=presence?.(p,'walker')??1;
        if(alpha>.01)walkers.push({p,x:pose.x,y:streetY(pose.x),pose,walking:pose.moving,direction:pose.direction,ground:streetY,alpha});
      }
      const drawGroup=items=>{
        items.sort((a,b)=>a.y-b.y);
        for(const item of items){
          if(item.alpha>.18)this.visible++;
          const fading=item.alpha<.999;
          if(fading){ctx.save();ctx.globalAlpha*=item.alpha;}
          if(this.ready&&window.PEOPLE_FRAMES){const result=this.sprite(ctx,item,time);if(result){this.storyHands.set(item.p.originX??item.p.x,result.hand);afterPerson?.(item,result);}}
          else{
            fallback(item.x,item.y,item.p.h/33,item.pose.phase,item.direction,window.ScrollWardrobe?.palettes[item.p.outfit]?.upper||'#8b917c',item.walking);
            afterPerson?.(item,{hand:{x:item.x+item.direction*item.p.h*.1,y:item.y-item.p.h*.48}});
          }
          if(fading)ctx.restore();
        }
      };
      // Dining and shop activity is behind the furniture. The public walking
      // lane is in front, even when a passerby shares a diner's foot height.
      drawGroup(residents);
      drawFurniture();
      drawGroup(walkers);
      this.phaseSample=Math.sin(time*.81+population.residents[0].phase);
    }
    sprite(ctx,{p,x,y,pose,walking,direction,ground},time){
      const art=p.art,f=art?.frame??window.PEOPLE_FRAMES[p.sprite],texture=art?.texture??this.textureFor(p),h=p.h,w=h*f.w/f.h*([6,7,8].includes(p.sprite)?.80:1);
      const natural=art?.direction??[1,1,1,1,1,-1,1,-1,1,-1,1,1][p.sprite];
      const seated=[6,7,8].includes(p.sprite),flip=direction*natural,contacts=art?.contacts??this.contacts[p.sprite];
      // The controlled figure keeps the last foot placement on release.
      // Only the lifted sole settles; the legs do not snap to the source pose.
      const feet=(walking||pose.gaitWeight!==undefined?movement.gaitAt((pose.phase||0)/.15,h,pose.gaitWeight??1):contacts.map(c=>({x:(c.x/f.w-.5)*w,lift:0,stance:true})))
        .map(foot=>({...foot,y:(ground?ground(x+foot.x*flip)-y:0)-foot.lift}));
      const hand=art?.grips[0]??movement.hands[p.sprite].map((n,i)=>(n-(i?f.y:f.x))/(i?f.h:f.w));
      const rig={w,h,f,contacts,feet,pose,hand,walking};
      const density=3,pw=Math.ceil((w+24)*density),ph=Math.ceil((h+16)*density);
      // Small seated/working gestures need fewer mesh rebuilds than camera
      // movement. Stagger them by character; moving feet still update every
      // display frame. Each resident retains just one bounded-size bitmap.
      const cacheable=p.id?.startsWith('resident-')&&!walking&&pose.gaitWeight===undefined,tick=Math.floor((time+(p.phase||0))*12);
      let cached=cacheable?this.residentFrames.get(p.id):null;
      if(cacheable&&!cached){
        const image=document.createElement('canvas');image.width=pw;image.height=ph;
        cached={image,context:image.getContext('2d',{willReadFrequently:true}),tick:-1};this.residentFrames.set(p.id,cached);
      }
      if(!cached||cached.tick!==tick){
        const surface=cached?.context??this.motionContext;
        surface.setTransform(1,0,0,1,0,0);surface.clearRect(0,0,pw,ph);
        surface.setTransform(density,0,0,density,(w/2+12)*density,(h+8)*density);
        const columns=[0,.25,.5,.75,1],rows=[0,.12,.24,.38,.51,.64,.74,.84,.94,1];
        const points=rows.map(v=>columns.map(u=>({source:[u*f.w,v*f.h],target:movement.deform(u,v,rig)})));
        for(let row=0;row<rows.length-1;row++)for(let col=0;col<columns.length-1;col++){
          const p=points[row][col],q=points[row][col+1],r=points[row+1][col],s=points[row+1][col+1];
          // A quad is safe only when its fourth corner is exactly affine.
          // The old .12 tolerance left disconnected edges when zoomed in.
          if(Math.hypot(q.target[0]+r.target[0]-p.target[0]-s.target[0],q.target[1]+r.target[1]-p.target[1]-s.target[1])<1e-8){
            this.quad(surface,texture,p,q,r);
          }else{
            this.triangle(surface,texture,[p,q,r]);this.triangle(surface,texture,[q,s,r]);
          }
        }
        if(cached){cached.tick=tick;cached.hand=movement.deform(...hand,rig);}
      }
      ctx.save();ctx.translate(x,y);ctx.scale(flip,1);
      if(!seated)for(const foot of feet){
        ctx.beginPath();ctx.ellipse(foot.x,foot.y+foot.lift+.25,w*.085,.65,0,0,Math.PI*2);
        ctx.fillStyle=foot.stance?'#50463144':'#5046311b';ctx.fill();
      }
      ctx.drawImage(cached?.image??this.motionSurface,0,0,pw,ph,-w/2-12,-h-8,pw/density,ph/density);
      const handPoint=cached?.hand??movement.deform(...hand,rig);
      this.workObject(ctx,p,handPoint,h);
      ctx.restore();
      const project=point=>({x:x+point[0]*flip,y:y+point[1]});
      return {hand:project(handPoint),hands:(art?.grips??[hand]).map(uv=>project(movement.deform(...uv,rig)))};
    }
    workObject(ctx,p,[hx,hy],height){
      if(p.storyProp){window.StreetDetails?.object(ctx,p.storyProp,hx,hy,height/66);return;}
      if(p.story&&p.activity!=='weave')return;
      if(!['pack','weave','tend'].includes(p.activity))return;
      ctx.save();ctx.lineWidth=.55;ctx.strokeStyle='#665640';ctx.fillStyle='#ae9270';
      if(p.activity==='pack'){
        const size=height/60;
        ctx.translate(hx+2.4*size,hy+2.7*size);ctx.scale(size,size);
        ctx.beginPath();ctx.moveTo(-4,-2.3);ctx.quadraticCurveTo(0,-4,4.4,-2.1);ctx.lineTo(4.8,2.7);ctx.quadraticCurveTo(0,4,-4.4,2.5);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(-.8,-2.8);ctx.lineTo(.2,3.2);ctx.moveTo(-4.3,.4);ctx.lineTo(4.5,.2);ctx.stroke();
      }else if(p.activity==='weave'){
        ctx.beginPath();ctx.moveTo(hx-4,hy);ctx.lineTo(hx,hy-1.4);ctx.lineTo(hx+4,hy);ctx.lineTo(hx,hy+1.2);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(hx-2,hy);ctx.lineTo(hx+2,hy);ctx.strokeStyle='#d1bf97';ctx.stroke();
      }else{
        ctx.beginPath();ctx.moveTo(hx-2,hy-2);ctx.lineTo(hx+8,-1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(hx+6,-1);ctx.lineTo(hx+10,-1);ctx.lineTo(hx+11,1);ctx.lineTo(hx+6,1);ctx.closePath();ctx.fillStyle='#6b6957';ctx.fill();
      }
      ctx.restore();
    }
    quad(ctx,texture,p,q,r){
      const [sx,sy]=p.source,w=q.source[0]-sx,h=r.source[1]-sy;
      const a=(q.target[0]-p.target[0])/w,b=(q.target[1]-p.target[1])/w;
      const c=(r.target[0]-p.target[0])/h,d=(r.target[1]-p.target[1])/h;
      ctx.save();ctx.transform(a,b,c,d,p.target[0]-a*sx-c*sy,p.target[1]-b*sx-d*sy);
      ctx.drawImage(texture,sx,sy,w,h,sx,sy,w,h);ctx.restore();
    }
    triangle(ctx,texture,vertices){
      const [p,q,r]=vertices,[sx,sy]=p.source,ux=q.source[0]-sx,uy=q.source[1]-sy,vx=r.source[0]-sx,vy=r.source[1]-sy;
      const det=ux*vy-uy*vx,dx=q.target[0]-p.target[0],dy=q.target[1]-p.target[1],ex=r.target[0]-p.target[0],ey=r.target[1]-p.target[1];
      const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,c=(ex*ux-dx*vx)/det,d=(ey*ux-dy*vx)/det;
      const cx=(p.target[0]+q.target[0]+r.target[0])/3,cy=(p.target[1]+q.target[1]+r.target[1])/3;
      ctx.save();ctx.beginPath();
      vertices.forEach(({target:[x,y]},i)=>{const distance=Math.hypot(x-cx,y-cy)||1;const px=x+(x-cx)/distance*.13,py=y+(y-cy)/distance*.13;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});
      // Limit sampling to this mesh cell instead of resampling the whole
      // portrait behind every small triangular clip.
      const left=Math.max(0,Math.floor(Math.min(...vertices.map(v=>v.source[0])))-1);
      const top=Math.max(0,Math.floor(Math.min(...vertices.map(v=>v.source[1])))-1);
      const width=Math.min(texture.width,Math.ceil(Math.max(...vertices.map(v=>v.source[0])))+1)-left;
      const height=Math.min(texture.height,Math.ceil(Math.max(...vertices.map(v=>v.source[1])))+1)-top;
      ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p.target[0]-a*sx-c*sy,p.target[1]-b*sx-d*sy);
      ctx.drawImage(texture,left,top,width,height,left,top,width,height);ctx.restore();
    }
  }
  window.Inhabitants=Inhabitants;
})();
