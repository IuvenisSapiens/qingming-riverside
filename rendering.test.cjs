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
  crowd.sprite(ctx,item,10);crowd.sprite(ctx,item,10.001);
  assert.equal(triangles-before,144,'walking feet are never cached between frames');
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
