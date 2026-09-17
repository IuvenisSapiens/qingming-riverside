const test=require('node:test');
const assert=require('node:assert/strict');
const {gaitAt,footContacts,deform,activityAt,speeds}=require('./movement.js');
const {residents,walkers}=require('./population.js');

test('the planted foot stays in the same world position as the body moves',()=>{
  for(const h of [44,60,74])for(const direction of [-1,1]){
    const step=h*.32,start=step*.08;
    const anchor=direction*(start+gaitAt(start,h)[0].x);
    for(let d=start;d<step*.9;d+=.1){
      const feet=gaitAt(d,h),planted=feet[0];
      assert.equal(planted.stance,true);assert.equal(planted.lift,0);
      assert.ok(Math.abs(direction*(d+planted.x)-anchor)<1e-8,'stance must not slide across the street');
      assert.ok(feet.some(f=>f.stance),'at least one foot bears weight');
      assert.ok(feet.every(f=>f.lift>=0&&f.lift<h*.04));
    }
  }
});
test('sole calibration ignores transparent margins and faint edge pixels',()=>{
  const w=40,h=80,data=new Uint8ClampedArray(w*h*4);
  for(let y=50;y<72;y++)for(const x of [7,8,9,30,31,32])data[(y*w+x)*4+3]=255;
  data[((h-1)*w+4)*4+3]=12;
  const feet=footContacts(data,w,h);
  assert.deepEqual(feet,[{x:8.5,y:72},{x:31.5,y:72}]);
});
test('hand and torso activity cannot lift or displace the planted soles',()=>{
  const contacts=[{x:40,y:390},{x:165,y:398}],feet=[{x:-8,y:2},{x:8,y:-3}];
  for(const activity of ['drink','eat','pour','trade','pottery','weave','mill','pack','tend','row','look']){
    for(let t=0;t<6;t+=.25){
      const rig={w:30,h:60,f:{w:200,h:400},contacts,feet,pose:activityAt(activity,t,0,5),hand:[.8,.45],walking:false};
      contacts.forEach((p,i)=>{
        const result=deform(p.x/200,p.y/400,rig);
        assert.ok(Math.abs(result[0]-feet[i].x)<1e-8,activity);
        assert.ok(Math.abs(result[1]-feet[i].y)<1e-8,activity);
      });
    }
  }
});
test('residents use their work setting and gestures freeze with simulation time',()=>{
  for(const activity of ['pottery','weave','mill','pack','tend','drink','eat','pour','trade','look']){
    const group=residents.filter(p=>p.activity===activity);assert.ok(group.length,activity);
    const a=activityAt(activity,1),b=activityAt(activity,2);
    assert.notDeepEqual(a,b);assert.deepEqual(a,activityAt(activity,1));
  }
  assert.ok(residents.filter(p=>p.activity==='pottery').every(p=>p.x<-1000&&p.x>-1350));
  assert.ok(residents.filter(p=>p.activity==='weave').every(p=>p.x<-650&&p.x>-1000));
  assert.equal(speeds.walk,102);assert.equal(speeds.auto,62);
  assert.ok(walkers.every(p=>p.speed>=23));
});
