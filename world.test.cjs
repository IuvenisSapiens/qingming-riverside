const test=require('node:test');
const assert=require('node:assert/strict');
const {createFerry,summonFerry,stepFerry,pedestrianAt,streetY,frontRailY,boardFerry,passengerPose,isPassenger,pavilionGeometry,ferryTravelDuration,berths}=require('./world.js');

test('ferry approaches without teleporting, docks, waits, departs and returns',()=>{
  const ferry=createFerry();summonFerry(ferry);
  const seen=new Set();let previous={...ferry};
  for(let i=0;i<3600;i++){
    stepFerry(ferry,1/60);seen.add(ferry.mode);
    assert.ok(Math.hypot(ferry.x-previous.x,ferry.y-previous.y)<=.83);
    previous={...ferry};
  }
  for(const mode of ['approaching','docked','departing','returning','waiting'])assert.ok(seen.has(mode),mode);
  assert.equal(ferry.visits,1);assert.equal(ferry.mode,'waiting');
});
test('zero elapsed time freezes ferry; requesting it again preserves its position',()=>{
  const ferry=createFerry();summonFerry(ferry);stepFerry(ferry,1);
  const before={...ferry};stepFerry(ferry,0);assert.deepEqual(ferry,before);
  ferry.mode='returning';summonFerry(ferry);
  assert.equal(ferry.x,before.x);assert.equal(ferry.y,before.y);assert.equal(ferry.mode,'approaching');
});
test('pedestrians pause at both ends and reverse within their street segment',()=>{
  const p={from:100,to:200,speed:10,pause:3};
  assert.deepEqual(pedestrianAt(p,5),{x:150,direction:1,moving:true,phase:7.5});
  assert.equal(pedestrianAt(p,11).moving,false);assert.equal(pedestrianAt(p,11).x,200);
  assert.equal(pedestrianAt(p,18).x,150);assert.equal(pedestrianAt(p,18).direction,-1);
  assert.equal(pedestrianAt(p,24).x,100);assert.equal(pedestrianAt(p,24).moving,false);
  for(let t=0;t<200;t+=.1){const value=pedestrianAt(p,t);assert.ok(value.x>=100&&value.x<=200);}
});

test('walking feet stay on the traced bridge deck, behind the front railing',()=>{
  assert.equal(streetY(1200),477);assert.equal(streetY(1740),477);
  assert.equal(streetY(1400),427);assert.equal(streetY(1520),402);assert.equal(streetY(1640),433);
  for(let x=1353;x<=1711;x+=1){
    const heightAboveFeet=streetY(x)-frontRailY(x);
    assert.ok(heightAboveFeet>12&&heightAboveFeet<26,`rail position at ${x}`);
  }
  for(let x=1200;x<1800;x+=.5)assert.ok(Math.abs(streetY(x+.5)-streetY(x))<.4,'no vertical jumps');
});

test('passenger boards continuously, travels, lands and can make the return trip',()=>{
  const ferry=createFerry();summonFerry(ferry);ferry.hold=true;
  for(let i=0;i<1200;i++)stepFerry(ferry,1/60);
  assert.equal(ferry.mode,'docked');assert.equal(boardFerry(ferry),true);
  let before=passengerPose(ferry);assert.equal(before.x,2000);assert.equal(before.y,streetY(2000));
  const seen=new Set();
  for(let i=0;i<4200&&isPassenger(ferry);i++){
    stepFerry(ferry,1/60);seen.add(ferry.mode);
    if(isPassenger(ferry)){const p=passengerPose(ferry);assert.ok(Math.hypot(p.x-before.x,p.y-before.y)<2);before=p;}
  }
  assert.equal(ferry.berth,'west');assert.equal(ferry.mode,'moored');assert.equal(ferry.trips,1);
  assert.ok(Math.abs(before.x-568)<1);assert.ok(Math.abs(before.y-477)<1);
  for(const mode of ['boarding','sailing','disembarking','moored'])assert.ok(seen.has(mode));
  assert.equal(boardFerry(ferry),true);for(let i=0;i<3600;i++)stepFerry(ferry,1/60);
  assert.equal(ferry.berth,'east');assert.equal(ferry.trips,2);
});
test('every walking lane clears the pavilion plinth and joins the quay without vertical jumps',()=>{
  for(const lane of [-1,0,1]){
    for(let x=1820;x<=1994;x+=.5){
      assert.ok(streetY(x,lane)>pavilionGeometry.plinth.bottom,`feet clear masonry at ${x}`);
      assert.ok(streetY(x,lane)<487,'feet remain on the quay above the water');
    }
    for(let x=1730;x<2070;x+=.25)assert.ok(Math.abs(streetY(x+.25,lane)-streetY(x,lane))<.15,'continuous lane approaches');
  }
  assert.equal(streetY(1900,-1),streetY(1900,1),'narrow passage has no sideways lane jitter');
  assert.equal(streetY(1770),477);assert.equal(streetY(2070),477);
});
test('riding cannot be interrupted by a second summon or move while paused',()=>{
  const ferry=createFerry();ferry.mode='docked';ferry.x=2085;ferry.y=556;boardFerry(ferry);
  const before={...ferry};assert.equal(summonFerry(ferry,'west'),false);stepFerry(ferry,0);assert.deepEqual(ferry,before);
  assert.equal(boardFerry(ferry),false);
});
test('passenger ferry uses a slow eased crossing rather than racing between banks',()=>{
  const ferry=createFerry();ferry.mode='docked';ferry.x=2085;ferry.y=556;boardFerry(ferry);
  while(ferry.mode==='boarding')stepFerry(ferry,1/60);
  assert.equal(ferry.mode,'sailing');
  for(let i=0;i<ferryTravelDuration*30;i++)stepFerry(ferry,1/60);
  const midpoint=(berths.east.x+berths.west.x)/2;
  assert.ok(Math.abs(ferry.x-midpoint)<3,'halfway through the trip stays near the river midpoint');
  assert.equal(ferry.mode,'sailing');
});
