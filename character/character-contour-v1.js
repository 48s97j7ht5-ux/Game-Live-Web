import * as THREE from 'three';

/**
 * Character Contour v1 — authored 2.5D silhouette driven by Skeleton Contract v1.
 *
 * The skeleton supplies pose and depth. Screen-space curves supply the visual
 * anatomy. The result is deliberately a flat, hard-edged 400 px art mask: it is
 * the first stable input for later skin, face, hair and clothing pixel layers.
 */
export const CHARACTER_CONTOUR_VERSION='1.0.0';
export const REQUIRED_SKELETON_CONTRACT=1;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const WORK_SIZE=1024;

export function createCharacterContourV1(api,{camera=window.__SKELETON_CAMERA__,visible=true,color='#15120f',background='#f1ede5',width=320,height=440,targetHeight=400}={}){
 if(!api||api.contractVersion!==REQUIRED_SKELETON_CONTRACT)throw new Error('Character Contour v1 requires Skeleton Contract v1');
 if(!camera)throw new Error('Character Contour v1 requires a camera');

 const host=document.createElement('div');host.id='characterContourV1';host.dataset.layer='character-contour-v1';
 Object.assign(host.style,{position:'fixed',zIndex:'3',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:`${width}px`,height:`${height}px`,maxWidth:'calc(100vw - 20px)',maxHeight:'calc(100vh - 20px)',pointerEvents:'none',overflow:'hidden',background,border:'1px solid rgba(255,255,255,.16)',borderRadius:'2px',boxShadow:'0 18px 50px rgba(0,0,0,.34)'});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('aria-label','Character Contour v1: algorithmic 400 pixel silhouette');
 Object.assign(canvas.style,{display:'block',width:'100%',height:'100%',imageRendering:'pixelated'});host.appendChild(canvas);document.body.appendChild(host);
 const output=canvas.getContext('2d',{alpha:true,willReadFrequently:true}),work=document.createElement('canvas');work.width=WORK_SIZE;work.height=WORK_SIZE;
 const ctx=work.getContext('2d',{alpha:true,willReadFrequently:true});ctx.imageSmoothingEnabled=false;output.imageSmoothingEnabled=false;
 const world=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),forward=new THREE.Vector3(),cameraQ=new THREE.Quaternion();
 let disposed=false,lastSignature='',lastDiagnostics=null,raf=0;

 function object(name){return api.getJoint(name)||api.jointRoot.getObjectByName(name)||api.jointRoot.getObjectByName(`joint_${name}`)||null}
 function worldPoint(name,offset=null){const node=object(name);if(!node)throw new Error(`Character Contour v1 missing anchor ${name}`);world.copy(offset||new THREE.Vector3()).applyMatrix4(node.matrixWorld);return world.clone()}
 function cameraBasis(){camera.getWorldQuaternion(cameraQ);right.set(1,0,0).applyQuaternion(cameraQ).normalize();up.set(0,1,0).applyQuaternion(cameraQ).normalize();forward.set(0,0,-1).applyQuaternion(cameraQ).normalize()}
 function projectWorld(p){return{x:WORK_SIZE*.5+p.dot(right)*330,y:WORK_SIZE*.68-p.dot(up)*330,depth:p.dot(forward)}}
 function point(name,offset=null){return projectWorld(worldPoint(name,offset))}
 function mix(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,depth:a.depth+(b.depth-a.depth)*t}}
 function normalize(x,y){const length=Math.hypot(x,y)||1;return{x:x/length,y:y/length}}
 function offsetPoint(p,n,d){return{x:p.x+n.x*d,y:p.y+n.y*d,depth:p.depth}}
 function ellipse(p,rx,ry,rotation=0){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rotation);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()}

 function ribbon(points,widths){
  if(points.length<2)return;const normals=[],tangents=[];
  for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],t=normalize(b.x-a.x,b.y-a.y);tangents.push(t);normals.push({x:-t.y,y:t.x});
  }
  const left=points.map((p,i)=>offsetPoint(p,normals[i],widths[i])),rightEdge=points.map((p,i)=>offsetPoint(p,normals[i],-widths[i]));
  ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);
  for(let i=1;i<left.length-1;i++){const mid=mix(left[i],left[i+1],.5);ctx.quadraticCurveTo(left[i].x,left[i].y,mid.x,mid.y)}
  ctx.lineTo(left.at(-1).x,left.at(-1).y);ctx.quadraticCurveTo(points.at(-1).x+tangents.at(-1).x*widths.at(-1)*.9,points.at(-1).y+tangents.at(-1).y*widths.at(-1)*.9,rightEdge.at(-1).x,rightEdge.at(-1).y);
  for(let i=rightEdge.length-2;i>0;i--){const mid=mix(rightEdge[i],rightEdge[i-1],.5);ctx.quadraticCurveTo(rightEdge[i].x,rightEdge[i].y,mid.x,mid.y)}
  ctx.lineTo(rightEdge[0].x,rightEdge[0].y);ctx.quadraticCurveTo(points[0].x-tangents[0].x*widths[0]*.9,points[0].y-tangents[0].y*widths[0]*.9,left[0].x,left[0].y);ctx.closePath();ctx.fill();
 }

 function drawHead(frontness){
  const pivot=point('head'),above=point('head',new THREE.Vector3(0,.1,0)),center=point('head',new THREE.Vector3(0,.058,.018)),localUp=normalize(above.x-pivot.x,above.y-pivot.y),u={x:-localUp.y,y:localUp.x};
  const halfW=330*(.084+.027*frontness),halfH=330*.124;
  const q=(x,y)=>({x:center.x+u.x*x*halfW+localUp.x*y*halfH,y:center.y+u.y*x*halfW+localUp.y*y*halfH});
  const top=q(0,1),lu=q(-.74,.88),lt=q(-1,.36),lj=q(-.78,-.52),chin=q(0,-1),rj=q(.78,-.52),rt=q(1,.36),ru=q(.74,.88);
  ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.bezierCurveTo(lu.x,lu.y,lt.x,lt.y,lt.x,lt.y);ctx.bezierCurveTo(lt.x,lt.y,lj.x,lj.y,chin.x,chin.y);ctx.bezierCurveTo(rj.x,rj.y,rt.x,rt.y,rt.x,rt.y);ctx.bezierCurveTo(rt.x,rt.y,ru.x,ru.y,top.x,top.y);ctx.closePath();ctx.fill();
 }

 function drawTorso(frontness){
  const centers=[point('spine_T1'),point('spine_T3'),point('spine_T7'),point('spine_T12'),point('spine_L3'),point('spine_S1'),mix(point('hip_L'),point('hip_R'),.5)];
  const front=[.130,.166,.158,.128,.104,.136,.158],side=[.068,.103,.118,.106,.093,.116,.135],widths=front.map((v,i)=>330*(side[i]+(v-side[i])*frontness));
  ribbon(centers,widths);
  const chest=point('spine_T7');if(frontness>.22){const breastW=330*(.041+.015*frontness),breastH=330*.054,spread=330*.057*frontness;ellipse({x:chest.x-spread,y:chest.y+5},breastW,breastH);ellipse({x:chest.x+spread,y:chest.y+5},breastW,breastH)}
 }

 function drawNeck(frontness){const t1=point('spine_T1'),head=point('head'),w0=330*(.045+.008*frontness),w1=330*(.037+.007*frontness);ribbon([t1,mix(t1,head,.52),head],[w0,(w0+w1)*.5,w1])}

 function drawArm(side,frontness){
  const shoulder=point(`shoulder_${side}`),elbow=point(`elbow_${side}`),wrist=point(`wrist_${side}`),deltoid=mix(shoulder,elbow,.18),upperMid=mix(shoulder,elbow,.55),foreMid=mix(elbow,wrist,.42);
  const shoulderW=330*(.034+.006*frontness),upper=330*(.039+.006*frontness),elbowW=330*(.029+.004*frontness),wristW=330*(.021+.003*frontness);
  ribbon([shoulder,deltoid,upperMid,elbow,foreMid,wrist],[shoulderW,upper,upper*.88,elbowW,elbowW*1.06,wristW]);
 }
 function drawHand(side,wrist,frontness){
  const mcp=point(`finger_mcp_${side}_2`),tip=point(`finger_${side}_2_2`),palm=mix(wrist,mcp,.58),finger=mix(mcp,tip,.68);
  ribbon([wrist,palm,mcp,finger,tip],[330*.022,330*(.029+.004*frontness),330*.027,330*.019,330*.010]);ellipse(tip,330*.010,330*.010);
  const thumb=point(`thumb_tip_${side}`),thumbBase=point(`thumb_mcp_${side}`);if(Math.hypot(thumb.x-palm.x,thumb.y-palm.y)>330*.025){ribbon([thumbBase,mix(thumbBase,thumb,.62),thumb],[330*.012,330*.010,330*.006]);ellipse(thumb,330*.006,330*.006)}
 }

 function drawLeg(side,frontness){
  const hip=point(`hip_${side}`),knee=point(`knee_${side}`),ankle=point(`ankle_${side}`),thigh1=mix(hip,knee,.36),thigh2=mix(hip,knee,.72),calf=mix(knee,ankle,.38),shin=mix(knee,ankle,.72);
  const hipW=330*(.068+.017*frontness),kneeW=330*(.044+.006*frontness),ankleW=330*(.029+.005*frontness);
  ribbon([hip,thigh1,thigh2,knee,calf,shin,ankle],[hipW,hipW*.96,hipW*.78,kneeW,kneeW*1.13,kneeW*.83,ankleW]);
 }
 function drawFoot(side,ankle,frontness){
  const heel=point(`heel_${side}`),big=point(`tip_${side}_0`),middle=point(`tip_${side}_2`),toe=mix(big,middle,.52),instep=mix(ankle,toe,.45),width=330*(.032+.016*frontness);
  ribbon([heel,ankle,instep,toe],[width*.74,width,Math.max(width*.86,330*.028),330*.014]);ellipse(toe,330*.014,330*.010);
 }

 function carveCrotch(frontness){
  if(frontness<.38)return;const lHip=point('hip_L'),rHip=point('hip_R'),lKnee=point('knee_L'),rKnee=point('knee_R'),hip=mix(lHip,rHip,.5),knees=mix(lKnee,rKnee,.5),down=normalize(knees.x-hip.x,knees.y-hip.y),side={x:-down.y,y:down.x},separation=Math.hypot(lHip.x-rHip.x,lHip.y-rHip.y);
  if(separation<18)return;const top=offsetPoint(hip,down,330*.052),bottom=offsetPoint(hip,down,330*.118),half=clamp(separation*.12,3,8);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.moveTo(top.x+side.x*half,top.y+side.y*half);ctx.quadraticCurveTo(bottom.x,bottom.y,bottom.x,bottom.y);ctx.quadraticCurveTo(top.x-side.x*half,top.y-side.y*half,top.x+side.x*half,top.y+side.y*half);ctx.fill();ctx.restore();
 }

 function hardPixelScale(){
  const src=ctx.getImageData(0,0,WORK_SIZE,WORK_SIZE),data=src.data;let minX=WORK_SIZE,minY=WORK_SIZE,maxX=-1,maxY=-1,pixels=0;
  for(let y=0;y<WORK_SIZE;y++)for(let x=0;x<WORK_SIZE;x++){const i=(y*WORK_SIZE+x)*4,a=data[i+3]>=128?255:0;data[i+3]=a;if(a){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);pixels++}}
  output.clearRect(0,0,width,height);output.fillStyle=background;output.fillRect(0,0,width,height);
  if(maxX<minX)return{bounds:null,sourcePixels:0,outputPixels:0,actualHeight:0,actualWidth:0,hardEdges:true,components:0,clipped:false};
  const sourceW=maxX-minX+1,sourceH=maxY-minY+1,desiredH=Math.min(targetHeight,height-40),scale=desiredH/sourceH,targetW=Math.max(1,Math.round(sourceW*scale)),drawW=Math.min(targetW,width-12),drawH=drawW<targetW?Math.round(desiredH*drawW/targetW):desiredH,startX=Math.floor((width-drawW)/2),startY=Math.floor((height-drawH)/2),mask=output.createImageData(drawW,drawH);let outputPixels=0;
  const rgb=parseColor(color);
  for(let y=0;y<drawH;y++)for(let x=0;x<drawW;x++){const sx=minX+Math.min(sourceW-1,Math.floor(x*sourceW/drawW)),sy=minY+Math.min(sourceH-1,Math.floor(y*sourceH/drawH)),sourceIndex=(sy*WORK_SIZE+sx)*4,targetIndex=(y*drawW+x)*4;if(data[sourceIndex+3]){mask.data[targetIndex]=rgb[0];mask.data[targetIndex+1]=rgb[1];mask.data[targetIndex+2]=rgb[2];mask.data[targetIndex+3]=255;outputPixels++}}
  output.putImageData(mask,startX,startY);return{bounds:{x:startX,y:startY,width:drawW,height:drawH},sourcePixels:pixels,outputPixels,actualHeight:drawH,actualWidth:drawW,hardEdges:true,components:countComponents(mask.data,drawW,drawH),clipped:drawW<targetW};
 }
 function parseColor(value){const clean=String(value).replace('#','');const hex=clean.length===3?clean.split('').map(c=>c+c).join(''):clean;const n=Number.parseInt(hex,16);return Number.isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[21,18,15]}
 function countComponents(data,w,h){const seen=new Uint8Array(w*h);let components=0;for(let i=0;i<w*h;i++){if(seen[i]||!data[i*4+3])continue;components++;const stack=[i];seen[i]=1;while(stack.length){const p=stack.pop(),x=p%w,y=(p/w)|0;for(const n of [p-1,p+1,p-w,p+w]){if(n<0||n>=w*h||seen[n]||!data[n*4+3])continue;const nx=n%w,ny=(n/w)|0;if(Math.abs(nx-x)+Math.abs(ny-y)!==1)continue;seen[n]=1;stack.push(n)}}}return components}
 function signature(){api.jointRoot.updateMatrixWorld(true);camera.updateMatrixWorld(true);const anchors=['head','spine_T1','spine_T7','spine_L3','pelvis_center','shoulder_L','elbow_L','wrist_L','shoulder_R','elbow_R','wrist_R','hip_L','knee_L','ankle_L','hip_R','knee_R','ankle_R'];return anchors.map(name=>{const p=worldPoint(name);return`${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`}).join('|')+'|'+camera.position.toArray().map(v=>v.toFixed(3)).join(',')+'|'+camera.quaternion.toArray().map(v=>v.toFixed(3)).join(',')}
 function update(force=false){
  if(disposed)return null;api.jointRoot.updateMatrixWorld(true);camera.updateMatrixWorld(true);const next=signature();if(!force&&next===lastSignature)return lastDiagnostics;lastSignature=next;cameraBasis();
  const frontness=clamp(Math.abs(forward.z),0,1);ctx.clearRect(0,0,WORK_SIZE,WORK_SIZE);ctx.fillStyle=color;
  const depthSides=['L','R'].sort((a,b)=>point(`shoulder_${a}`).depth-point(`shoulder_${b}`).depth);for(const side of depthSides)drawArm(side,frontness);for(const side of depthSides)drawLeg(side,frontness);drawTorso(frontness);drawNeck(frontness);drawHead(frontness);for(const side of depthSides)drawHand(side,point(`wrist_${side}`),frontness);for(const side of depthSides)drawFoot(side,point(`ankle_${side}`),frontness);carveCrotch(frontness);
  const raster=hardPixelScale(),finite=Number.isFinite(frontness)&&raster.bounds&&Object.values(raster.bounds).every(Number.isFinite),checks={contract:api.contractVersion===1,finite:!!finite,pixelTarget:raster.actualHeight===Math.min(targetHeight,height-40)||raster.clipped,hardEdges:raster.hardEdges,nonEmpty:raster.outputPixels>2000,componentEnvelope:raster.components>=1&&raster.components<=8};
  lastDiagnostics={version:CHARACTER_CONTOUR_VERSION,stature:api.getRestMetrics?.().stature??1.75,targetPixelHeight:targetHeight,canvas:{width,height},view:{frontness},raster,checks,pass:Object.values(checks).every(Boolean)};return lastDiagnostics;
 }
 function loop(){if(disposed)return;update(false);raf=requestAnimationFrame(loop)}
 function setVisible(next){host.hidden=!next;return!host.hidden}
 function setColor(next){color=String(next);lastSignature='';return update(true)}
 function getDiagnostics(){return lastDiagnostics||update(true)}
 function dispose(){disposed=true;cancelAnimationFrame(raf);host.remove()}

 update(true);setVisible(visible);raf=requestAnimationFrame(loop);const validation=getDiagnostics();if(!validation.pass)throw new Error('Character Contour v1 validation failed: '+JSON.stringify(validation));
 const contourApi=Object.freeze({version:CHARACTER_CONTOUR_VERSION,host,canvas,update,getDiagnostics,validate:getDiagnostics,setVisible,setColor,dispose});api.jointRoot.userData.characterContour=contourApi;return contourApi;
}
