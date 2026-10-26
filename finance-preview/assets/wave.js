/* Liquid-metal silk background: WebGL domain-warped fbm height field, lit like brushed chrome. Monochrome. */
(function(){
const cv=document.getElementById('wave');if(!cv)return;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,mob=matchMedia('(max-width:900px)').matches;
const gl=cv.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
if(!gl){document.documentElement.classList.add('nowave');return}
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;uniform vec2 R;uniform float t,S,Y0;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.45;}return v;}
float fb3(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p;a*=.4;}return v;}
float H(vec2 p){vec2 q=vec2(fb3(p+vec2(0.,t*.5)),fb3(p+vec2(5.2,1.3)-t*.35));
 vec2 r=vec2(fb3(p+4.0*q+vec2(1.7,9.2)+t*.22),fb3(p+4.0*q+vec2(8.3,2.8)-t*.18));
 return fb3(p*.9+4.2*r);}
void main(){vec2 px=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y+Y0);vec2 p=px/S*vec2(1.,-1.)*1.0+vec2(3.1,1.7);
 float e=.004;float h=H(p),hx=H(p+vec2(e,0.)),hy=H(p+vec2(0.,e));
 vec2 g=vec2(hx-h,hy-h)/e;vec3 n=normalize(vec3(-g*.24,1.));
 vec3 L=normalize(vec3(-.55,.65,.55));float d=max(dot(n,L),0.);
 vec3 hv=normalize(L+vec3(0,0,1));float sp=0.;float sp2=pow(max(dot(n,normalize(vec3(.6,-.3,1.))),0.),12.);
 float fr=pow(1.-n.z,1.6);
 float band=.5+.5*sin(h*15.+g.x*.3);
 vec3 c=vec3(.035,.037,.041)+vec3(.19,.195,.205)*pow(d,1.8)+vec3(.55,.56,.58)*pow(max(dot(n,hv),0.),24.)+vec3(.10,.105,.11)*sp2+vec3(.05)*fr*band;
 c*=.7+.45*smoothstep(.2,.75,h);
 gl_FragColor=vec4(pow(c,vec3(.95)),1.);}`;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.warn(gl.getShaderInfoLog(s));return s}
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const al=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
const U={R:gl.getUniformLocation(pr,'R'),t:gl.getUniformLocation(pr,'t'),S:gl.getUniformLocation(pr,'S'),Y0:gl.getUniformLocation(pr,'Y0')};
const Q=window.WAVEQ||(mob?.5:.42);let tt=window.WAVET||8.0,last=performance.now(),run=!reduce&&!mob&&!window.WAVESTILL;
function size(hcss){const w=innerWidth,h=hcss||innerHeight;cv.width=Math.round(w*Q);cv.height=Math.round(h*Q);gl.viewport(0,0,cv.width,cv.height)}
function draw(){gl.uniform2f(U.R,cv.width,cv.height);gl.uniform1f(U.t,tt);gl.uniform1f(U.S,900*Q);gl.uniform1f(U.Y0,0);gl.drawArrays(gl.TRIANGLES,0,3)}
size();draw();requestAnimationFrame(()=>cv.classList.add('on'));
addEventListener('resize',()=>{if(cv.dataset.full)return;size();draw()});
let vis=true;document.addEventListener('visibilitychange',()=>vis=!document.hidden);
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(run&&vis){tt+=dt*.045;draw()}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
/* full-page still for stitched screenshots */
window.__waveFull=()=>{run=false;const H=document.documentElement.scrollHeight;cv.dataset.full=1;cv.style.position='absolute';cv.style.height=H+'px';size(H);draw()};
window.__waveShot=(w,h,q)=>{run=false;cv.width=w;cv.height=h;gl.viewport(0,0,w,h);gl.uniform2f(U.R,w,h);gl.uniform1f(U.t,tt);gl.uniform1f(U.S,h);gl.uniform1f(U.Y0,0);gl.drawArrays(gl.TRIANGLES,0,3);return cv.toDataURL('image/jpeg',q||.86)};
})();
