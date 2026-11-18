import * as T from 'three';
// A stylised A1 for the workshop. The feet reproduce the cup + rubber ball principle.
import { printState } from './printer-motion.js';
export function createA1(){
 const root=new T.Group();root.name='Bambu Lab A1 on vibration isolators';
 const white=new T.MeshStandardMaterial({color:'#d7dcd8',roughness:.48}),gray=new T.MeshStandardMaterial({color:'#8e9998',roughness:.38,metalness:.52}),dark=new T.MeshStandardMaterial({color:'#313b3b',roughness:.65}),rubber=new T.MeshStandardMaterial({color:'#252f2d',roughness:.93}),gold=new T.MeshStandardMaterial({color:'#b6a367',roughness:.8}),orange=new T.MeshStandardMaterial({color:'#d38d4d',roughness:.7}),yellow=new T.MeshStandardMaterial({color:'#e6ce52',roughness:.5});
 const mesh=(geo,mat,x=0,y=0,z=0,parent=root)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(w,h,d,mat,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,p);
 const cyl=(r,h,mat,x,y,z,p,n=24)=>mesh(new T.CylinderGeometry(r,r,h,n),mat,x,y,z,p);
 const ball=(r,mat,x,y,z,p)=>mesh(new T.SphereGeometry(r,16,10),mat,x,y,z,p);
 const tube=(a,b,r,mat,p)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=cyl(r,av.distanceTo(bv),mat,0,0,0,p,8);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;};
 function label(text,w,h,size=26,bg='#d6ddd7',fg='#465453'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font=`${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}));}
 const body=new T.Group();body.position.y=.17;root.add(body);
 const feet=[];
 for(const x of [-.54,.54])for(const z of [-.49,.49]){
  const foot=new T.Group();foot.position.set(x,0,z);root.add(foot);
  cyl(.105,.035,white,0,.018,0,foot);cyl(.085,.027,dark,0,.047,0,foot);const b=ball(.068,rubber,0,.089,0,foot);b.scale.set(1,.85,1);feet.push(b);
  cyl(.088,.045,white,x,-.026,z,body);cyl(.105,.025,white,x,-.001,z,body);
 }
 box(1.31,.17,1.31,white,0,.105,0,body);box(1.18,.04,1.19,dark,0,.008,0,body);box(1.23,.028,1.23,white,0,.205,0,body);
 const brand=label('Bambu Lab  A1',.51,.095,38);brand.position.set(-.22,.11,.659);body.add(brand);
 for(let i=0;i<7;i++)box(.15,.01,.005,dark,.45,.067+i*.016,.663,body);
 // Twin upright columns and the fixed top bridge.
 for(const x of [-.54,.54]){box(.12,1.42,.16,white,x,.92,-.43,body);box(.036,1.28,.018,gray,x, .91,-.334,body);box(.15,.075,.2,dark,x,1.66,-.43,body);}
 box(1.08,.075,.13,gray,0,1.66,-.43,body);
 const gantry=new T.Group();gantry.position.set(0,.8,-.32);body.add(gantry);
 box(1.44,.095,.13,gray,0,0,0,gantry);box(1.35,.018,.025,dark,0,.014,.079,gantry);
 for(const x of [-.59,.59])box(.19,.19,.22,white,x,0,0,gantry);
 // Front screen, tilted upward on its bracket.
 const lcd=new T.Group();lcd.position.set(.6,.25,.59);lcd.rotation.x=-.48;body.add(lcd);box(.36,.22,.045,dark,0,0,0,lcd);const screen=label('A1   /   PRINTING',.31,.17,27,'#172e2b','#b5d9ac');screen.position.z=.027;lcd.add(screen);box(.15,.16,.08,gray,.6,.15,.53,body);
 const bed=new T.Group();bed.position.y=.265;body.add(bed);box(.98,.056,.98,dark,0,0,0,bed);box(.97,.012,.97,gold,0,.036,0,bed);box(.13,.022,.09,gold,-.4,.032,.52,bed);const bedMark=label('BAMBU  TEXTURED PEI',.65,.04,23,'#b5a167','#5d5c46');bedMark.position.set(0,.044,.43);bedMark.rotation.x=-Math.PI/2;bed.add(bedMark);
 // Printed vase: the visible wall grows upwards with successive layers.
 const vase=new T.Group();vase.position.y=.045;bed.add(vase);const points=[];for(let i=0;i<=24;i++){const v=i/24;points.push(new T.Vector2(.11+.025*Math.sin(v*Math.PI*2),v*.4));}const vaseBands=[];orange.side=T.DoubleSide;for(let i=0;i<40;i++){const y0=i*.01,y1=(i+1)*.01;const radius=y=>.11+.025*Math.sin(y/.4*Math.PI*2);const band=mesh(new T.LatheGeometry([new T.Vector2(radius(y0),y0),new T.Vector2(radius(y1),y1)],24),orange,0,0,0,vase);vaseBands.push(band);}
 const layers=[];for(let i=1;i<28;i++){const y=i*.014;const r=.11+.025*Math.sin((y/.4)*Math.PI*2);const m=mesh(new T.TorusGeometry(r,.0018,4,24),gold,0,y,0,vase);m.rotation.x=Math.PI/2;layers.push(m);}
 const head=new T.Group();head.position.z=.32;gantry.add(head);box(.22,.29,.23,white,0,.025,0,head);box(.18,.07,.17,dark,0,-.14,.02,head);const fan=cyl(.056,.013,dark,0,.025,.125,head);fan.rotation.x=Math.PI/2;const hub=cyl(.019,.018,yellow,0,.025,.136,head);hub.rotation.x=Math.PI/2;for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const sl=box(.01,.036,.006,gray,Math.sin(a)*.038,.025+Math.cos(a)*.038,.139,head);sl.rotation.z=-a;}
 const nozzle=mesh(new T.ConeGeometry(.019,.055,12),gold,0,-.198,.015,head);nozzle.rotation.x=Math.PI;box(.06,.07,.08,gray,-.13,-.01,.01,head);
 // Single spool above the gantry. No AMS unit takes up the desk.
 tube([.48,1.66,-.45],[.48,2.12,-.45],.025,dark,body);tube([.48,2.12,-.45],[.17,2.12,-.45],.025,dark,body);
 const spool=new T.Group();spool.position.set(.03,2.12,-.45);spool.rotation.z=Math.PI/2;body.add(spool);cyl(.23,.21,orange,0,0,0,spool,32);for(const y of [-.12,.12]){cyl(.26,.025,dark,0,y,0,spool,32);cyl(.083,.03,gray,0,y*1.1,0,spool,24);}
 const filament=[];for(let i=0;i<12;i++)filament.push(tube([0,0,0],[0,.1,0],.011,white,body));
 const filamentBegin=new T.Vector3(.2,2.12,-.4),end=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),up=new T.Vector3(0,1,0);
 function update(seconds,still=false){const s=printState(seconds);body.rotation.set(still?0:s.rockX,0,still?0:s.rockZ);body.position.x=still?0:s.shiftX;bed.position.z=s.z;gantry.position.y=.51+s.height;head.position.x=s.x;for(let i=0;i<vaseBands.length;i++)vaseBands[i].visible=(i+1)*.01<=s.height;for(const l of layers)l.visible=l.position.y<s.height;
  spool.rotation.y=seconds*.12;end.set(s.x,gantry.position.y+.2,.0);const at=(t,v)=>v.copy(filamentBegin).lerp(end,t).add(new T.Vector3(0,Math.sin(Math.PI*t)*.36,.18*Math.sin(Math.PI*t)));
  for(let i=0;i<filament.length;i++){at(i/12,a);at((i+1)/12,b);const m=filament[i];m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b)/.1;m.quaternion.setFromUnitVectors(up,b.sub(a).normalize());}
  for(let i=0;i<feet.length;i++)feet[i].scale.y=.85+(still?0:.03*Math.sin(seconds*14+(i%2)*Math.PI));
 }
 update(15,true);return {root,update};
}
