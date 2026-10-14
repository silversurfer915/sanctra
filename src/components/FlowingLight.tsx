import {useEffect,useRef} from 'react';
import './flowing-light.css';

const vertex=`attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
// Original continuous folded-light artwork. No imagery, network assets or timer wallpapers.
const fragment=`precision mediump float;
uniform vec2 resolution; uniform float time;
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 float x=uv.x, y=uv.y;
 vec3 color=mix(vec3(.055,.064,.08),vec3(.15,.16,.19),y);
 float atmosphere=exp(-length((uv-vec2(.78,.66))*vec2(1.05,1.4))*3.);
 color+=vec3(.14,.12,.12)*atmosphere;
 for(int i=0;i<7;i++){
  float f=float(i), t=time*.12;
  float center=.18+f*.095+.17*sin(x*5.1+t+f*.34)+.12*sin(x*2.9-t*.6+f*.22);
  float width=.034+.025*(.5+.5*sin(x*3.+f+t));
  float d=(y-center)/width;
  float body=exp(-d*d*.65);
  float edge=exp(-pow((d-.65)*3.,2.));
  float shine=.5+.5*sin(x*4.3+f*.7-t);
  vec3 silk=mix(vec3(.95,.71,.70),vec3(.79,.86,.94),.5+.5*sin(f*.8+x*2.));
  silk=mix(silk,vec3(.98,.91,.82),max(0.,sin(f*1.5+x))* .22);
  float right=smoothstep(.02,.55,x);
  color=mix(color,silk*(.26+.42*shine),body*.58*right);
  color+=silk*edge*.43*right;
 }
 float halo=exp(-length((uv-vec2(.84,.64))*vec2(1.2,2.))*7.);
 color+=vec3(.22,.18,.15)*halo;
 gl_FragColor=vec4(color,1.);
}`;

export function FlowingLight({paused=false,className=''}:{paused?:boolean;className?:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
  const shaders:WebGLShader[]=[];
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)return null;gl.shaderSource(s,source);gl.compileShader(s);shaders.push(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
  if(!vs||!fs||!program){shaders.forEach(s=>gl.deleteShader(s));return;}
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const size=gl.getUniformLocation(program,'resolution'),clock=gl.getUniformLocation(program,'time');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=true,frame=0,last=0,elapsed=0;
  const render=(now:number)=>{frame=0;if(now-last>=40){elapsed+=last?Math.min(now-last,100)/1000:0;last=now;gl.uniform1f(clock,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);}if(canMove())frame=requestAnimationFrame(render);};
  const canMove=()=>!paused&&!reduced.matches&&visible&&document.visibilityState==='visible';
  const sync=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(canMove())frame=requestAnimationFrame(render);};
  const resize=()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(size,canvas.width,canvas.height);gl.uniform1f(clock,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);};
  const observer=new ResizeObserver(resize);observer.observe(canvas);const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});intersection.observe(canvas);
  const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(frame);canvas.style.opacity='0';};
  canvas.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);resize();sync();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
 },[paused]);
 return <div className={`flowing-light ${className}`} aria-hidden="true"><canvas ref={ref}/></div>;
}
