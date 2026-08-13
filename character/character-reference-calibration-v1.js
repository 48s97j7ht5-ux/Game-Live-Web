import * as THREE from 'three';

const TURNAROUND_VERSION='1.0.0';
const CANVAS={width:320,height:440,crownY:20,floorY:420,targetHeight:400};
const VIEW_LABELS={front:'фронт · 0°',frontThree:'¾ спереди · 45°',side:'профиль · 90°',rearThree:'¾ сзади · 135°',back:'спина · 180°'};
const VIEWS={
 front:{angle:0,centerX:90.5,crown:41,floor:449,halfWidth:77.5},
 frontThree:{angle:45,centerX:235.5,crown:41,floor:448.5,halfWidth:77.5},
 side:{angle:90,centerX:392,crown:41,floor:448.5,halfWidth:60},
 rearThree:{angle:135,centerX:536.5,crown:41,floor:448.5,halfWidth:77.5},
 back:{angle:180,centerX:685,crown:41,floor:448.5,halfWidth:77.5}
};

const mod=await import('./skeleton-v16.js?v=20260813-reference-calibration-v1');
const api=mod.skeletonAPI;if(!api)throw new Error('Reference Calibration v1: Skeleton API missing');
document.querySelector('#app canvas')?.remove();
const canvas=document.getElementById('calibrationCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
const image=new Image();image.src='./assets/character-turnaround-reference-v1.png?v=20260813-reference-calibration-v1';await image.decode();
const state={view:'front',reference:true,skeleton:true,sections:true,referenceOpacity:.72,skeletonOpacity:.92,scale:1,x:0,y:0};
const world=new THREE.Vector3(),root=api.jointRoot;root.updateMatrixWorld(true);

function object(name){return api.getJoint(name)||root.getObjectByName(name)||root.getObjectByName(`joint_${name}`)||null}
function point3(name){const node=object(name);if(!node)throw new Error(`Reference Calibration missing ${name}`);return node.getWorldPosition(new THREE.Vector3())}
function levelY(name){return point3(name).y}
function project(value,angle=VIEWS[state.view].angle){const radians=THREE.MathUtils.degToRad(angle),u=value.x*Math.cos(radians)-value.z*Math.sin(radians),pixels=CANVAS.targetHeight/(api.getRestMetrics?.().stature??1.75)*state.scale;return{x:CANVAS.width*.5+u*pixels+state.x,y:CANVAS.floorY-value.y*pixels+state.y}}
function p(name){return project(point3(name))}

function renderReference(targetContext,viewKey,opacity=1){
 const view=VIEWS[viewKey],scale=CANVAS.targetHeight/(view.floor-view.crown),sourceX=view.centerX-view.halfWidth,sourceWidth=view.halfWidth*2,targetX=CANVAS.width*.5-view.halfWidth*scale,targetY=CANVAS.crownY-view.crown*scale;targetContext.save();targetContext.fillStyle='#f4f0e8';targetContext.fillRect(0,0,CANVAS.width,CANVAS.height);targetContext.globalAlpha=opacity;targetContext.imageSmoothingEnabled=false;targetContext.drawImage(image,sourceX,0,sourceWidth,image.naturalHeight,targetX,targetY,sourceWidth*scale,image.naturalHeight*scale);targetContext.restore();
}
function line(names,color='#71d8ff',width=1.35){const points=names.map(name=>p(name));ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const next of points.slice(1))ctx.lineTo(next.x,next.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function joint(name,radius=2.5,color='#ff9d66'){const q=p(name);ctx.beginPath();ctx.arc(q.x,q.y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function drawSkeleton(){
 ctx.save();ctx.globalAlpha=state.skeletonOpacity;ctx.lineCap='round';ctx.lineJoin='round';
 const spine=['spine_S1','spine_L5','spine_L4','spine_L3','spine_L2','spine_L1','spine_T12','spine_T10','spine_T7','spine_T4','spine_T1','neck_C7','neck_C4','neck_C1','head'];line(spine,'#78dcff',1.55);
 line(['sc_L','ac_L','shoulder_L'],'#a6e7ff');line(['sc_R','ac_R','shoulder_R'],'#a6e7ff');line(['shoulder_L','spine_T3','shoulder_R'],'#a6e7ff',1.1);
 for(const side of ['L','R']){line([`shoulder_${side}`,`elbow_${side}`,`wrist_${side}`,`finger_mcp_${side}_2`,`finger_${side}_2_2`]);line([`wrist_${side}`,`thumb_mcp_${side}`,`thumb_tip_${side}`],'#78dcff',1);line([`hip_${side}`,`knee_${side}`,`ankle_${side}`,`heel_${side}`]);line([`ankle_${side}`,`toe_mtp_${side}_2`,`tip_${side}_2`],'#78dcff',1.2)}
 line(['hip_L','pelvis_center','hip_R'],'#a6e7ff',1.4);const head=p('head'),crown=project(point3('crown')),chin=project(point3('chin'));ctx.beginPath();ctx.ellipse(head.x,(chin.y+crown.y)*.5,22*state.scale,Math.max(13,(chin.y-crown.y)*.5),0,0,Math.PI*2);ctx.strokeStyle='#78dcff';ctx.lineWidth=1.25;ctx.stroke();
 const joints=['head','neck_C1','spine_T1','spine_T7','spine_L3','spine_S1','pelvis_center','shoulder_L','shoulder_R','elbow_L','elbow_R','wrist_L','wrist_R','hip_L','hip_R','knee_L','knee_R','ankle_L','ankle_R'];for(const name of joints)joint(name,name.includes('shoulder')||name.includes('hip')?3:2.35);
 ctx.restore();
}
const LEVELS=[
 {key:'shoulder',label:'Плечи',referenceY:90,skeletonY:()=>levelY('shoulder_L')},
 {key:'chest',label:'Грудная клетка',referenceY:142,skeletonY:()=>levelY('spine_T7')},
 {key:'waist',label:'Талия',referenceY:194,skeletonY:()=>levelY('spine_L3')},
 {key:'pelvis',label:'Таз',referenceY:220,skeletonY:()=>levelY('hip_L')},
 {key:'thigh',label:'Бедро',referenceY:279,skeletonY:()=>THREE.MathUtils.lerp(levelY('hip_L'),levelY('knee_L'),.42)},
 {key:'knee',label:'Колено',referenceY:321,skeletonY:()=>levelY('knee_L')},
 {key:'calf',label:'Икра',referenceY:357,skeletonY:()=>THREE.MathUtils.lerp(levelY('knee_L'),levelY('ankle_L'),.48)},
 {key:'ankle',label:'Лодыжка',referenceY:402,skeletonY:()=>levelY('ankle_L')}
];
function drawSections(){ctx.save();ctx.font='9px system-ui';ctx.textBaseline='middle';for(const level of LEVELS){const y=level.referenceY;ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(211,83,104,.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(2,y);ctx.lineTo(CANVAS.width-2,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(104,23,39,.78)';ctx.fillText(level.label,5,y-6)}ctx.restore()}
function draw(){renderReference(ctx,state.view,state.reference?state.referenceOpacity:0);if(state.sections)drawSections();if(state.skeleton)drawSkeleton();document.getElementById('skeletonPixelHeight').textContent=`${Math.round(CANVAS.targetHeight*state.scale)} px`;document.getElementById('viewStatus').textContent=VIEW_LABELS[state.view]}

function bodyRunWidth(data,y){
 const row=clamp(Math.round(y),0,CANVAS.height-1),runs=[];let start=-1,last=-1;
 function bodyPixel(x){const index=(row*CANVAS.width+x)*4,r=data[index],g=data[index+1],b=data[index+2],distance=Math.hypot(r-244,g-240,b-232),neutral=Math.max(r,g,b)-Math.min(r,g,b)<10&&r>145;return distance>34&&!neutral}
 for(let x=18;x<CANVAS.width-18;x++){if(bodyPixel(x)){if(start<0)start=x;last=x}else if(start>=0&&x-last>2){runs.push([start,last]);start=-1;last=-1}}if(start>=0)runs.push([start,last]);
 const substantial=runs.filter(run=>run[1]-run[0]+1>=5);if(!substantial.length)return 0;substantial.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));return substantial[0][1]-substantial[0][0]+1;
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function normalizedPixels(view){const offscreen=document.createElement('canvas');offscreen.width=CANVAS.width;offscreen.height=CANVAS.height;const offscreenContext=offscreen.getContext('2d',{willReadFrequently:true});renderReference(offscreenContext,view,1);return offscreenContext.getImageData(0,0,CANVAS.width,CANVAS.height).data}
function buildMeasurements(){
 const front=normalizedPixels('front'),side=normalizedPixels('side'),cmPerPixel=164/CANVAS.targetHeight,rows=LEVELS.map(level=>{const width=bodyRunWidth(front,level.referenceY),depth=bodyRunWidth(side,level.referenceY),skeletonCanvasY=CANVAS.floorY-level.skeletonY()*CANVAS.targetHeight/(api.getRestMetrics?.().stature??1.75);return{...level,width,depth,widthCm:width*cmPerPixel,depthCm:depth*cmPerPixel,levelDelta:skeletonCanvasY-level.referenceY}}),table=document.getElementById('measurementTable');table.innerHTML=`<table><thead><tr><th>Уровень</th><th>шир.</th><th>глуб.</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.label}</td><td>${row.width}px<br>${row.widthCm.toFixed(1)}см</td><td>${row.depth}px<br>${row.depthCm.toFixed(1)}см</td></tr>`).join('')}</tbody></table>`;window.referenceCalibrationMeasurements=rows.map(({key,label,width,depth,widthCm,depthCm,referenceY,levelDelta})=>({key,label,width,depth,widthCm,depthCm,referenceY,levelDelta}));
}
function syncButtons(){document.querySelectorAll('[data-calibration-view]').forEach(button=>button.classList.toggle('active',button.dataset.calibrationView===state.view));document.getElementById('toggleReference').classList.toggle('active',state.reference);document.getElementById('toggleSkeleton').classList.toggle('active',state.skeleton);document.getElementById('toggleSections').classList.toggle('active',state.sections)}
function bindRange(id,key){const input=document.getElementById(id);input.addEventListener('input',()=>{state[key]=Number(input.value);draw()})}
for(const button of document.querySelectorAll('[data-calibration-view]'))button.onclick=()=>{state.view=button.dataset.calibrationView;syncButtons();draw()};
document.getElementById('toggleReference').onclick=()=>{state.reference=!state.reference;syncButtons();draw()};document.getElementById('toggleSkeleton').onclick=()=>{state.skeleton=!state.skeleton;syncButtons();draw()};document.getElementById('toggleSections').onclick=()=>{state.sections=!state.sections;syncButtons();draw()};
bindRange('referenceOpacity','referenceOpacity');bindRange('skeletonOpacity','skeletonOpacity');bindRange('skeletonScale','scale');bindRange('skeletonX','x');bindRange('skeletonY','y');
document.getElementById('resetCalibration').onclick=()=>{Object.assign(state,{reference:true,skeleton:true,sections:true,referenceOpacity:.72,skeletonOpacity:.92,scale:1,x:0,y:0});for(const [id,value] of [['referenceOpacity',.72],['skeletonOpacity',.92],['skeletonScale',1],['skeletonX',0],['skeletonY',0]])document.getElementById(id).value=String(value);syncButtons();draw()};

buildMeasurements();syncButtons();draw();
window.referenceCalibration=Object.freeze({version:TURNAROUND_VERSION,views:Object.keys(VIEWS),setView(view){if(!VIEWS[view])throw new Error(`unknown view ${view}`);state.view=view;syncButtons();draw()},getState:()=>({...state}),getMeasurements:()=>window.referenceCalibrationMeasurements,validate(){const measurements=window.referenceCalibrationMeasurements;const checks={contract:api.contractVersion===1,viewCount:Object.keys(VIEWS).length===5,targetHeight:CANVAS.targetHeight===400,imageLoaded:image.naturalWidth===782&&image.naturalHeight===503,finite:measurements.every(row=>[row.width,row.depth,row.widthCm,row.depthCm].every(Number.isFinite)),nonEmpty:measurements.every(row=>row.width>5&&row.depth>5)};return{version:TURNAROUND_VERSION,checks,pass:Object.values(checks).every(Boolean),measurements}}});
const validation=window.referenceCalibration.validate();if(!validation.pass)throw new Error('Reference Calibration v1 validation failed: '+JSON.stringify(validation));window.__REFERENCE_CALIBRATION_READY__=true;
