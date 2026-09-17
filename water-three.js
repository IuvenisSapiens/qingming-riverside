import * as THREE from './vendor/three.module.js';

const vertexShader=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
`;
const fragmentShader=`
precision highp float;
uniform float uTime,uPass;
uniform vec4 uView;
uniform sampler2D uBackdrop;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float heightAt(vec2 p){
 p=vec2(p.x-uTime*3.,(p.y-540.)*3.3);
 float h=0.;
 // Deep-water dispersion: shorter waves travel more slowly; no sliding grid.
 for(int i=0;i<7;i++){
  float f=float(i),k=.065+f*.029;
  vec2 d=normalize(vec2(cos(f*2.399),sin(f*2.399)));
  h+=sin(dot(p,d)*k-sqrt(36.*k)*uTime+f*3.71)*(.4/(1.+f*.65));
 }
 return h;
}
void main(){
 vec2 p=vec2(uView.x+vUv.x*uView.z,uView.y+(1.-vUv.y)*uView.w);
 if(uPass<.5){
  float bank=smoothstep(542.,558.,p.y);if(bank<.001)discard;
  float h=heightAt(p),dx=(heightAt(p+vec2(.7,0.))-h)/.7,dy=(heightAt(p+vec2(0.,.7))-h)/.7;
  vec3 normal=normalize(vec3(-dx,-dy*.32,1.));
  float spec=pow(max(dot(normal,normalize(vec3(-.22,-.28,1.))),0.),48.);
  vec2 offset=vec2(dx*10.,dy*2.2)*bank;
  vec2 uv=vUv+vec2(offset.x/uView.z,-offset.y/uView.w);
  vec3 base=texture2D(uBackdrop,clamp(uv,vec2(.001),vec2(.999))).rgb;
  vec3 col=mix(base,vec3(.30,.37,.35),.16);
  col+=vec3(.88,.87,.75)*(spec*.12);
  col-=vec3(.04)*smoothstep(-.1,.65,h);
  gl_FragColor=vec4(col,bank*.9);
 }else{
  // Advect texture by free-fall travel time, so streaks accelerate downward.
  float y=p.y-367.,g=185.,v0=35.;
  float tau=(sqrt(v0*v0+2.*g*max(y,0.))-v0)/g;
  float center=-1505.2-15.*exp(-max(y,0.)/18.);
  float width=13.+4.*clamp(y/173.,0.,1.);
  float edge=1.-smoothstep(width-2.,width+2.,abs(p.x-center));
  float mask=edge*smoothstep(365.,372.,p.y)*(1.-smoothstep(535.,546.,p.y));
  float threads=noise(vec2((p.x-center)*.55,(tau-uTime)*7.));
  float fine=noise(vec2((p.x-center)*1.8,(tau-uTime)*16.));
  float white=smoothstep(.38,.77,threads*.75+fine*.25);
  vec3 col=mix(vec3(.46,.53,.49),vec3(.94,.94,.84),white);
  float alpha=mask*(.28+white*.56);
  vec2 q=vec2(p.x+1505.2,(p.y-542.)*3.8);
  float r=length(q),foam=(1.-smoothstep(8.,40.,r))*noise(p*vec2(.30,.7)-vec2(uTime*1.8,uTime*3.));
  float ring=pow(.5+.5*sin(r*.52-uTime*5.5),14.)*exp(-r*.028)*smoothstep(12.,23.,r);
  float impact=max(foam*.86,ring*.27)*smoothstep(533.,541.,p.y);
  col=mix(col,vec3(.94,.94,.85),impact/max(alpha+impact,.001));
  alpha=max(alpha,impact);
  if(alpha<.005)discard;gl_FragColor=vec4(col,alpha);
 }
}
`;

export class ThreeWaterRenderer{
 constructor(){
  this.active=false;
  try{
   this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,premultipliedAlpha:true});
   this.renderer.setClearColor(0,0);
   this.scene=new THREE.Scene();this.camera=new THREE.Camera();
   this.uniforms={uTime:{value:0},uPass:{value:0},uView:{value:new THREE.Vector4()},uBackdrop:{value:null}};
   this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:this.uniforms,transparent:true,depthTest:false,depthWrite:false});
   this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.active=false;});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.active=true;});
   this.active=true;
  }catch(error){console.warn('Water uses Canvas fallback',error);}
 }
 resize(width,height,dpr=1){
  if(!this.active||width===this.width&&height===this.height&&dpr===this.dpr)return;
  this.width=width;this.height=height;this.dpr=dpr;
  this.renderer.setPixelRatio(Math.min(dpr,1.35));this.renderer.setSize(width,height,false);
 }
 render({time,camera,viewY,width,height,scale,source,pass=0}){
  if(!this.active)return null;
  if(source){
   if(!this.backdrop){
    this.backdrop=new THREE.CanvasTexture(source);
    this.backdrop.minFilter=THREE.LinearFilter;this.backdrop.generateMipmaps=false;
    this.uniforms.uBackdrop.value=this.backdrop;
   }
   this.backdrop.needsUpdate=true;
  }
  // Simulation time already freezes on pause. Never reset it to zero.
  this.uniforms.uTime.value=time;this.uniforms.uPass.value=pass;
  this.uniforms.uView.value.set(camera,viewY,width/scale,height/scale);
  this.renderer.render(this.scene,this.camera);return this.renderer.domElement;
 }
}
