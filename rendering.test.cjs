const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const movement=require('./movement.js');

function context(){return new Proxy({draws:[],drawImage(...args){this.draws.push(args);}},{get(target,key){return target[key]??(()=>{});}});}
function load(){
  const scope={window:{ScrollMovement:movement},Image:class{},document:{createElement(){return {width:0,height:0,getContext:()=>context()};}}};
  vm.runInNewContext(fs.readFileSync(`${__dirname}/inhabitants.js`,'utf8'),scope);
  return new scope.window.Inhabitants();
}

test('stationary gestures reuse a bounded bitmap while walking feet rebuild every frame',()=>{
  const crowd=load(),ctx=context();let triangles=0;
  crowd.triangle=()=>triangles++;crowd.quad=()=>triangles+=2;crowd.motionContext=context();crowd.motionSurface={};
  const art={frame:{w:200,h:400},texture:{width:200,height:400},direction:1,
    contacts:[{x:40,y:395},{x:160,y:400}],grips:[[.7,.4]]};
  const p={id:'resident-1',art,h:66,phase:0};
  const item={p,x:10,y:477,direction:1,walking:false,pose:movement.activityAt('drink',1)};
  crowd.sprite(ctx,item,1);assert.equal(triangles,72);
  const firstImage=ctx.draws.at(-1)[0];
  crowd.sprite(ctx,item,1.01);assert.equal(triangles,72);assert.equal(ctx.draws.at(-1)[0],firstImage);
  crowd.sprite(ctx,item,1.1);assert.equal(triangles,144);
  for(let t=2;t<10;t+=.1)crowd.sprite(ctx,item,t);
  assert.equal(crowd.residentFrames.size,1);assert.equal(ctx.draws.at(-1)[0],firstImage);
  const before=triangles;item.p={...p,id:'walker-1'};item.walking=true;
  crowd.sprite(ctx,item,10);const firstWalk=triangles-before;
  crowd.sprite(ctx,item,10.001);
  assert.ok(firstWalk>0);
  assert.equal(triangles-before,firstWalk*2,'walking feet are never cached between frames');
});

test('walking leg meshes never turn inside out when the feet pass each other',()=>{
  const crowd=load(),ctx=context();
  crowd.motionContext=context();crowd.motionSurface={};
  let checked=0;
  const verify=(_ctx,_texture,vertices)=>{
    const [a,b,c]=vertices.map(v=>v.target);
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    assert.ok(area>0,'a leg must retain its orientation throughout the stride');checked++;
  };
  crowd.triangle=verify;crowd.quad=(ctx,texture,p,q,r)=>verify(ctx,texture,[p,q,r]);
  for(const natural of [-1,1])for(const direction of [-1,1])for(let step=0;step<64;step++){
    const art={frame:{w:200,h:400},texture:{width:200,height:400},direction:natural,
      contacts:[{x:40,y:395},{x:160,y:400}],grips:[[.7,.4]]};
    crowd.sprite(ctx,{p:{art,h:63},x:0,y:0,direction,walking:true,
      pose:{phase:step/64*63*.64*.15}},0);
  }
  assert.ok(checked>1000);
});

test('mesh cells sample only their local source rectangle, with all three vertices inside it',()=>{
  const crowd=load(),ctx=context(),texture={width:400,height:800};
  const vertices=[{source:[100,200],target:[0,0]},{source:[200,200],target:[30,0]},
    {source:[100,300],target:[2,25]}];
  crowd.triangle(ctx,texture,vertices);
  const [image,x,y,w,h,dx,dy,dw,dh]=ctx.draws[0];
  assert.equal(image,texture);assert.ok(w*h<texture.width*texture.height*.04);
  for(const {source:[u,v]} of vertices)assert.ok(u>=x&&u<=x+w&&v>=y&&v<=y+h);
  assert.deepEqual([dx,dy,dw,dh],[x,y,w,h],'cropping preserves source coordinates for the affine transform');
});


test('paper extraction removes exterior white but preserves enclosed ivory and dark hair',()=>{
  const crowd=load(),width=7,height=7,data=new Uint8ClampedArray(width*height*4).fill(255);
  const pixel=(x,y,color)=>data.set([...color,255],(y*width+x)*4);
  for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)pixel(x,y,[50,45,35]);
  pixel(3,3,[248,247,244]); // ivory enclosed by the ink contour
  pixel(1,3,[210,208,205]); // exterior antialiased fringe
  crowd.removePaper({data,width,height});
  assert.equal(data[3],0);
  assert.equal(data[(3*width+3)*4+3],255);
  assert.equal(data[(2*width+2)*4+3],255);
  assert.ok(data[(3*width+1)*4+3]>0&&data[(3*width+1)*4+3]<255);
  assert.ok(data[(3*width+1)*4]<210,'white contamination is removed from the soft edge');
});
