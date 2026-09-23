(() => {
  'use strict';
  // A registered, non-interactive layer. The panorama itself is never replaced.
  const frame=document.querySelector('#atlasFrame');
  const NS='http://www.w3.org/2000/svg';
  const sky=document.createElementNS(NS,'svg');sky.id='atlasFestivalSky';
  sky.setAttribute('viewBox','0 0 2048 683');sky.setAttribute('aria-hidden','true');
  const source='assets/midautumn/sky-moon-osmanthus-v1.png';
  function svgNode(tag,attrs,parent=sky){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);parent.append(node);return node;}
  const defs=svgNode('defs',{});
  const mask=svgNode('mask',{id:'festival-sky-still',maskUnits:'userSpaceOnUse',x:0,y:0,width:2048,height:683},defs);
  svgNode('rect',{width:2048,height:683,fill:'white'},mask);
  // Separate each original lantern without regenerating the moon or clouds.
  const floating=[[55,155,82,99],[207,347,111,148],[837,184,82,98],[1236,443,88,104],[1827,380,104,123]];
  for(const [x,y,w,h] of floating)svgNode('rect',{x,y,width:w,height:h,fill:'black'},mask);
  svgNode('path',{d:'M1600 0H2048V335H1840L1800 271H1670L1660 180H1600Z',fill:'black'},mask);
  // Art-directed waxing phases for this festival, not an astronomical calendar.
  // Use Beijing dates even when a visitor is abroad or leaves the page open.
  const moonShade=svgNode('path',{fill:'black'},mask);
  const moonEdge=svgNode('filter',{id:'festival-moon-edge',x:'-10%',y:'-10%',width:'120%',height:'120%'},defs);
  svgNode('feGaussianBlur',{stdDeviation:1.2},moonEdge);
  moonShade.setAttribute('filter','url(#festival-moon-edge)');
  // These foreground cloud silhouettes must survive the lunar shadow mask.
  svgNode('path',{d:'M1200 281L1243 287L1275 300L1311 307L1354 305L1382 314L1345 323L1300 325L1274 339L1237 349L1200 351Z M1380 372L1420 359L1450 358L1484 341L1518 338L1548 344L1580 354L1580 407L1380 407Z',fill:'white'},mask);
  function updateMoonPhase(now=new Date()){
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const illumination=date<'2026-09-23'?.82:date<'2026-09-24'?.91:date<'2026-09-25'?.97:1;
    const cx=1425,cy=262,r=153,terminator=r*(2*illumination-1);
    moonShade.setAttribute('d',illumination===1?'':`M ${cx} ${cy-r} A ${r} ${r} 0 0 0 ${cx} ${cy+r} A ${terminator} ${r} 0 0 1 ${cx} ${cy-r} Z`);
    sky.dataset.moonDate=date;
    sky.dataset.moonIllumination=String(illumination);
  }
  updateMoonPhase();
  setInterval(updateMoonPhase,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMoonPhase();});
  svgNode('image',{href:source,width:2048,height:683,mask:'url(#festival-sky-still)',transform:'translate(0,-42)'});
  const lanterns=[...floating.map(rect=>({rect})),{rect:floating[0],position:[445,244],scale:1.12},{rect:floating[2],position:[1025,93],scale:.92}];
  lanterns.forEach(({rect:[x,y,w,h],position=[x,y],scale=1},i)=>{
    const placement=svgNode('g',{transform:`translate(${position[0]} ${position[1]}) scale(${scale}) translate(${-x} ${-y})`});
    const moving=svgNode('g',{class:'festival-floating-lantern',style:`--float-time:${7+i*1.3}s;--float-delay:${-i*2.1}s`},placement);
    const crop=svgNode('svg',{x,y,width:w,height:h,viewBox:`${x} ${y} ${w} ${h}`,overflow:'hidden'},moving);
    svgNode('image',{href:source,width:2048,height:683},crop);
  });
  // The complete branch has transparent margins, so no leaves meet a crop edge.
  // Root the stems beyond the right edge, including the image's transparent margin
  // and the full sway range, so the branch enters from outside the viewport.
  [[-27,.62],[21,.79],[0,1]].forEach(([angle,size],i)=>{
    const placement=svgNode('g',{transform:`translate(2160 95) rotate(${angle}) scale(${size}) translate(-2030 -90)`});
    const branch=svgNode('g',{class:'festival-osmanthus',style:`animation-duration:${10+i*1.7}s;animation-delay:${-i*2.4}s`},placement);
    svgNode('image',{href:'assets/midautumn/osmanthus-complete-v1.png',x:1545,y:28,width:485,height:286},branch);
  });
  // Small flowers follow staggered wind paths, separate from the branch.
  const petals=svgNode('g',{'aria-hidden':'true'});
  for(let i=0;i<18;i++){
    const x=1620+(i*67)%390,y=95+(i*43)%170;
    const drift=svgNode('g',{class:'festival-petal',style:`--petal-duration:${12+i%6*1.7}s;--petal-delay:${-i*2.37}s;--petal-dx:${-190-i%5*62}px;--petal-dy:${280+i%4*55}px`},petals);
    const flower=svgNode('g',{transform:`translate(${x} ${y}) scale(${.65+i%4*.17})`,fill:i%2?'#dcb05c':'#eed095'},drift);
    for(let k=0;k<4;k++)svgNode('ellipse',{cx:0,cy:-3,rx:2.2,ry:3.3,transform:`rotate(${k*90})`},flower);
    svgNode('circle',{r:1.2,fill:'#b68b42'},flower);
  }
  sky.setAttribute('preserveAspectRatio','xMaxYMin meet');
  document.querySelector('#atlasStage').append(sky);
  const layer=document.createElement('canvas');layer.id='atlasFestival';
  layer.width=2172;layer.height=724;layer.setAttribute('aria-hidden','true');
  document.querySelector('#atlasImage').after(layer);
  const c=layer.getContext('2d');
  const art=new Image();art.src='assets/midautumn/lantern-design-v1.png';
  // Positions are traced against the original composition in a 2048 x 683 space.
  const lamps=[
    [122,348,24],[183,325,25],[239,350,24],[277,386,24],
    [367,300,21],[405,307,21],[440,294,22],[480,293,22],
    [477,350,31],[524,350,28],[575,350,29],[626,350,30],[677,350,31],
    [545,290,22],[594,288,22],[642,291,22],
    [754,381,25],[797,381,25],[845,368,22],[887,346,23],
    [941,312,22],[984,294,21],[1027,284,21],[1073,282,21],[1115,292,21],[1156,309,22],[1200,333,23],
    [918,265,20],[948,265,20],[772,288,20],[824,287,20],
    [1279,352,26],[1326,352,26],[1381,352,28],[1434,377,27],
    [1287,256,19],[1334,255,19],[1390,264,19],
    [1470,393,29],[1511,394,28],[1557,393,29],
    [1636,310,26],[1677,311,26],[1720,311,26],[1752,357,27],[1818,389,27],
    [1830,161,24],[1863,161,24],[1897,161,24],[1932,161,24],
    [1859,286,32],[1940,285,32],[2016,332,27],
    [401,469,24],[482,469,24],[998,426,24],[1035,433,22],
    [1208,475,24],[1255,477,24],[1406,459,26],[1477,467,25],[1847,490,24],
    [1164,216,14],[1214,214,14],[1270,217,14],[1463,228,15],[1519,239,15],
    [1366,162,13],[1398,160,13],[1380,126,11]
  ];
  const windows=[
    [485,377,29,25],[530,375,29,26],[581,375,28,26],[633,375,29,26],
    [380,302,16,23],[419,302,16,23],[457,288,16,24],
    [1316,312,23,29],[1360,314,23,29],
    [1650,335,20,26],[1685,335,20,26],[1724,335,20,26],
    [1841,139,17,16],[1873,139,17,16],[1907,139,17,16],[1939,139,17,16],
    [1476,416,18,20],[1515,416,18,20],[1548,416,18,20]
  ];
  function glow(x,y,r,strength){
    const g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(255,201,101,${strength})`);
    g.addColorStop(.28,`rgba(244,162,64,${strength*.5})`);
    g.addColorStop(1,'rgba(238,156,56,0)');
    c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }
  function paint(){
    c.setTransform(2172/2048,0,0,724/683,0,0);c.clearRect(0,0,2048,683);
    // A gentle dusk wash keeps all ink detail visible, while separating warm lights.
    const dusk=c.createLinearGradient(0,0,0,683);
    dusk.addColorStop(0,'rgba(86,66,40,.10)');
    dusk.addColorStop(.40,'rgba(24,43,48,.30)');
    dusk.addColorStop(1,'rgba(30,48,55,.38)');
    c.fillStyle=dusk;c.fillRect(0,0,2048,683);
    c.globalCompositeOperation='screen';
    for(const [x,y,w,h] of windows){
      glow(x+w/2,y+h/2,w*1.65,.32);
      const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#e9a74726');g.addColorStop(.6,'#ffd07c66');g.addColorStop(1,'#f8ba5522');c.fillStyle=g;c.fillRect(x,y,w,h);
    }
    for(const [x,y,h] of lamps)glow(x,y+h*.38,h*1.8,.62);
    // Short broken reflections follow the existing horizontal water strokes.
    for(const [index,[x,start,length,width]] of [[150,550,70,33],[440,559,95,48],[648,535,85,30],[959,536,105,36],[1068,468,80,22],[1250,548,95,33],[1440,553,95,40],[1850,566,79,31]].entries()){
      for(let j=0;j<32;j++){
        const seed=Math.sin((j+1)*78.233+index*39.19)*43758.5453,rand=seed-Math.floor(seed);
        const t=j/32,xx=x+Math.sin(j*2.4+index)*width*(.2+t*.35),yy=start+t*length;
        const w=(3+rand*width*.65)*(1-t*.45);
        c.strokeStyle=`rgba(255,195,92,${(.18+rand*.40)*(1-t*.8)})`;c.lineWidth=.5+rand*1.1;
        c.beginPath();c.moveTo(xx-w/2,yy);c.lineTo(xx+w/2,yy-.6);c.stroke();
      }
    }
    c.globalCompositeOperation='source-over';
    if(art.complete&&art.naturalWidth){
      for(const [i,[x,y,h]] of lamps.entries()){
        const green=i%5===2,s=green?[803,86,518,932]:[274,48,380,968];
        const w=h*s[2]/s[3];
        c.strokeStyle='#92754aaa';c.lineWidth=.55;c.beginPath();c.moveTo(x,y-4);c.lineTo(x,y+2);c.stroke();
        c.drawImage(art,...s,x-w/2,y,w,h);
      }
    }
  }
  art.onload=paint;art.onerror=()=>{layer.remove();};if(art.complete&&art.naturalWidth)paint();
})();
