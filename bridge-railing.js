(function(root,factory){
  const railing=factory();
  if(typeof module==='object'&&module.exports)module.exports=railing;
  else root.BridgeRailing=railing;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Source-painting coordinates, not offsets from the pedestrian path.
  // Each timber has its own silhouette; the openings remain transparent.
  const cap=[[1352,424],[1380,411],[1400,404],[1425,396],[1450,388],
    [1471,383],[1508,379],[1544,379],[1576,382],[1595,386],[1618,394],
    [1645,405],[1688,427],[1718,445]];
  const capBottom=[[1352,430],[1380,417],[1400,410],[1425,402],[1450,394],
    [1471,389],[1508,385],[1544,385],[1576,388],[1595,392],[1618,400],
    [1645,411],[1688,433],[1718,451]];
  const middle=[[1352,438],[1380,425],[1400,417],[1425,409],[1450,401],
    [1471,397],[1508,391],[1544,391],[1576,394],[1595,398],[1618,405],
    [1645,417],[1688,440],[1718,457]];
  const middleBottom=middle.map(([x,y])=>[x,y+3.4]);
  const sill=[[1350,454],[1380,442],[1400,433],[1425,425],[1450,416],
    [1471,411],[1508,405],[1544,405],[1576,408],[1595,413],[1618,421],
    [1645,433],[1688,455],[1718,472]];
  const underside=[[1350,469],[1380,457],[1400,448],[1425,439],[1450,431],
    [1471,425],[1508,420],[1544,420],[1576,424],[1595,429],[1618,437],
    [1645,449],[1688,471],[1718,480]];
  const posts=[
    [1355,417,458,7],[1427,385,434,8],[1472,373,415,5],
    [1508,373,411,5],[1544,373,410,4.5],[1576,372,418,5.5],
    [1618,383,436,8],[1688,420,467,7],[1718,440,478,6]
  ];
  const at=(path,x)=>{
    let i=0;while(i<path.length-2&&path[i+1][0]<x)i++;
    const [a,b]=path[i],[c,d]=path[i+1];return b+(d-b)*(x-a)/(c-a);
  };
  const band=(top,bottom)=>[...top,...bottom.slice().reverse()];
  const silhouettes=[band(cap,capBottom),band(middle,middleBottom),band(sill,underside)];
  for(const [x,top,bottom,w] of posts){
    // Rounded carved finial, shoulder, upright. No oversized rectangular eraser.
    silhouettes.push([[x-w*.35,top+2],[x-w*.22,top],[x+w*.22,top],
      [x+w*.4,top+2],[x+w*.4,top+5],[x+w*.5,top+6],
      [x+w*.5,bottom],[x-w*.5,bottom],[x-w*.5,top+6],[x-w*.35,top+5]]);
  }
  // Small uprights only between the middle beam and sill; never through bodies
  // above the handrail. Their spacing follows the individual painted panels.
  const balusters=[1363,1370,1383,1390,1401,1411,1418,1438,1446,1454,1462,
    1481,1488,1497,1517,1527,1535,1553,1563,1585,1593,1602,1610,
    1628,1636,1646,1655,1665,1676,1698,1707];
  for(const x of balusters){
    const top=at(middleBottom,x),bottom=at(sill,x);
    silhouettes.push([[x-1,top],[x+1,top],[x+1,bottom],[x-1,bottom]]);
  }
  function draw(ctx,artwork,min,max){
    if(max<1346||min>1723)return;
    ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.beginPath();
    for(const ring of silhouettes){
      ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    }
    ctx.clip();
    // Restore actual ink/wood texture, rather than cutting transparent stripes
    // through people and hoping the stripes happen to match the painting.
    ctx.drawImage(artwork,0,0,2172,724);
    ctx.restore();
  }
  return {draw,silhouettes,posts,cap,capBottom,middle,middleBottom,sill};
});
