const VERSION='1.0.1';
const CELL={width:256,height:440,crownY:20,targetHeight:400};
const VIEWS=[
 {key:'front',angle:0,index:0},
 {key:'frontThree',angle:45,index:1},
 {key:'side',angle:90,index:2},
 {key:'rearThree',angle:135,index:3},
 {key:'back',angle:180,index:4}
];
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const state={row:155,tolerance:3,allViews:true,angle:28};
const reference=await loadImage('./assets/slicer-reference-v1.png?v=20260813-body-slicer-alpha-v101');
const referenceCanvas=document.createElement('canvas');referenceCanvas.width=reference.naturalWidth;referenceCanvas.height=reference.naturalHeight;
const referenceContext=referenceCanvas.getContext('2d',{willReadFrequently:true});referenceContext.drawImage(reference,0,0);
const referenceData=referenceContext.getImageData(0,0,referenceCanvas.width,referenceCanvas.height).data;
const sliceCache=new Map();let volumePoints=[];

function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
function activeViews(all=state.allViews){return all?VIEWS:[VIEWS[0],VIEWS[2]]}
function isBodyAlpha(view,x,y){const px=clamp(Math.round(x),0,CELL.width-1),py=clamp(Math.round(y),0,CELL.height-1),index=(py*referenceCanvas.width+view.index*CELL.width+px)*4;return referenceData[index+3]>127}
function rowRuns(view,row,tolerance=state.tolerance){
 const y=CELL.crownY+clamp(Math.round(row),0,CELL.targetHeight-1),runs=[];let start=-1;
 for(let x=0;x<CELL.width;x++){
  const filled=isBodyAlpha(view,x,y);
  if(filled&&start<0)start=x;
  if(start>=0&&(!filled||x===CELL.width-1)){const end=filled?x:x-1;if(end-start>=1)runs.push([start-128-tolerance,end-128+tolerance]);start=-1}
 }
 return runs;
}
function contains(value,runs){return runs.some(([start,end])=>value>=start&&value<=end)}
function computeSlice(row,step=2,all=state.allViews,tolerance=state.tolerance){
 const key=`${row}:${step}:${all?1:0}:${tolerance}`;if(sliceCache.has(key))return sliceCache.get(key);
 const constraints=activeViews(all).map(view=>({view,runs:rowRuns(view,row,tolerance),cos:Math.cos(view.angle*Math.PI/180),sin:Math.sin(view.angle*Math.PI/180)}));
 const cells=[];
 if(constraints.every(item=>item.runs.length))for(let z=-128;z<128;z+=step)for(let x=-128;x<128;x+=step){let pass=true;for(const item of constraints){const projection=x*item.cos-z*item.sin;if(!contains(projection,item.runs)){pass=false;break}}if(pass)cells.push([x,z])}
 const result={row,step,cells,area:cells.length*step*step,constraints};sliceCache.set(key,result);return result;
}
function runPixelCount(runs){return runs.reduce((sum,[start,end])=>sum+end-start+1,0)}
function runExtent(runs){if(!runs.length)return 0;return Math.max(...runs.map(run=>run[1]))-Math.min(...runs.map(run=>run[0]))+1}

function projectionOverlay(view){
 const canvas=document.createElement('canvas');canvas.width=CELL.width;canvas.height=CELL.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ff5f77';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='destination-in';ctx.drawImage(reference,view.index*CELL.width,0,CELL.width,CELL.height,0,0,CELL.width,CELL.height);return canvas;
}
const overlays=VIEWS.map(projectionOverlay);
function drawTransparencyGrid(ctx){for(let y=0;y<CELL.height;y+=12)for(let x=0;x<CELL.width;x+=12){ctx.fillStyle=((x/12+y/12)&1)?'#1b2430':'#111821';ctx.fillRect(x,y,12,12)}}
function drawProjection(canvas,view){
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);drawTransparencyGrid(ctx);ctx.drawImage(reference,view.index*CELL.width,0,CELL.width,CELL.height,0,0,CELL.width,CELL.height);ctx.globalAlpha=.12;ctx.drawImage(overlays[view.index],0,0);ctx.globalAlpha=1;
 const y=CELL.crownY+state.row,runs=rowRuns(view,state.row,0);ctx.strokeStyle='#8b97a8';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(CELL.width,y+.5);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#45e8ff';ctx.lineWidth=3;for(const [a,b] of runs){ctx.beginPath();ctx.moveTo(a+128,y+.5);ctx.lineTo(b+128,y+.5);ctx.stroke()}
}
function drawSlice(result){
 const canvas=$('sliceCanvas'),ctx=canvas.getContext('2d');ctx.fillStyle='#0d131c';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#263346';ctx.lineWidth=1;for(let i=0;i<=256;i+=32){ctx.beginPath();ctx.moveTo(i+.5,0);ctx.lineTo(i+.5,256);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i+.5);ctx.lineTo(256,i+.5);ctx.stroke()}ctx.fillStyle='#ff7890';for(const [x,z] of result.cells)ctx.fillRect(x+128,z+128,result.step,result.step);ctx.strokeStyle='#66dfff';ctx.beginPath();ctx.moveTo(128.5,0);ctx.lineTo(128.5,256);ctx.moveTo(0,128.5);ctx.lineTo(256,128.5);ctx.stroke();ctx.fillStyle='#9fb0c6';ctx.font='10px system-ui';ctx.fillText('X →',231,124);ctx.fillText('Z ↓',132,12);
}
function boundary(cells,step){const keys=new Set(cells.map(([x,z])=>`${x},${z}`));return cells.filter(([x,z])=>!keys.has(`${x-step},${z}`)||!keys.has(`${x+step},${z}`)||!keys.has(`${x},${z-step}`)||!keys.has(`${x},${z+step}`))}
function rebuildVolume(){
 volumePoints=[];for(let row=0;row<CELL.targetHeight;row+=4){const slice=computeSlice(row,4);for(const [x,z] of boundary(slice.cells,4))volumePoints.push({x,z,row})}drawVolume();
}
function drawVolume(){
 const canvas=$('volumeCanvas'),ctx=canvas.getContext('2d'),r=state.angle*Math.PI/180;ctx.fillStyle='#0f151e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#263346';for(let y=20;y<=420;y+=50){ctx.beginPath();ctx.moveTo(12,y+.5);ctx.lineTo(canvas.width-12,y+.5);ctx.stroke()}
 const projected=volumePoints.map(point=>{const screenX=point.x*Math.cos(r)+point.z*Math.sin(r),depth=-point.x*Math.sin(r)+point.z*Math.cos(r);return{...point,screenX,depth}}).sort((a,b)=>a.depth-b.depth);for(const p of projected){const x=canvas.width/2+p.screenX*.92,y=20+p.row-p.depth*.055,light=clamp(62-p.depth*.13,34,78);ctx.fillStyle=`hsl(351 78% ${light}%)`;ctx.fillRect(x-1,y-1,2.2,2.2)}
 ctx.strokeStyle='#65ddff';ctx.strokeRect(.5,20.5,canvas.width-1,400);ctx.fillStyle='#9fb0c6';ctx.font='10px system-ui';ctx.fillText(`${state.allViews?'5 видов':'фронт + профиль'} · шаг 4 px`,10,14);
}
function updateMetrics(result){
 const frontRuns=rowRuns(VIEWS[0],state.row,0),sideRuns=rowRuns(VIEWS[2],state.row,0),basic=computeSlice(state.row,2,false,state.tolerance),full=computeSlice(state.row,2,true,state.tolerance),ratio=basic.area?full.area/basic.area:0;
 $('heightPercent').textContent=`${(state.row/399*100).toFixed(1)}%`;$('frontSpan').textContent=`${runPixelCount(frontRuns)} px · ${frontRuns.length}`;$('sideSpan').textContent=`${runPixelCount(sideRuns)} px · ${sideRuns.length}`;$('sliceArea').textContent=Math.round(result.area).toLocaleString('ru-RU');$('coherence').textContent=`${Math.round(ratio*100)}%`;
 const status=$('status');if(state.row<68){status.className='warning';status.textContent='Черновая зона головы: силуэт содержит волосы.'}else if(!result.cells.length){status.className='warning';status.textContent='Проекции противоречат друг другу на этой строке — увеличь допуск.'}else{status.className='ready';status.textContent='Срез рассчитан непосредственно по бинарным маскам эталона.'}
}
function render({volume=false}={}){drawProjection($('frontCanvas'),VIEWS[0]);drawProjection($('sideCanvas'),VIEWS[2]);const result=computeSlice(state.row,2);drawSlice(result);updateMetrics(result);$('sliceValue').textContent=`${state.row} / 399`;$('toleranceValue').textContent=`${state.tolerance} px`;$('angleValue').textContent=`${state.angle}°`;if(volume)rebuildVolume();else drawVolume();$('frontSideMode').classList.toggle('active',!state.allViews);$('allViewsMode').classList.toggle('active',state.allViews)}

$('sliceY').addEventListener('input',event=>{state.row=Number(event.target.value);render()});
$('tolerance').addEventListener('input',event=>{state.tolerance=Number(event.target.value);sliceCache.clear();render({volume:true})});
$('volumeAngle').addEventListener('input',event=>{state.angle=Number(event.target.value);render()});
$('frontSideMode').onclick=()=>{state.allViews=false;sliceCache.clear();render({volume:true})};
$('allViewsMode').onclick=()=>{state.allViews=true;sliceCache.clear();render({volume:true})};

rebuildVolume();render();
window.bodySlicer=Object.freeze({version:VERSION,setRow(row){state.row=clamp(Math.round(row),0,399);$('sliceY').value=state.row;render()},getSlice(row=state.row){const result=computeSlice(row,2),frontRuns=rowRuns(VIEWS[0],row,0);return{row:result.row,area:result.area,cellCount:result.cells.length,frontRuns,frontPixelCount:runPixelCount(frontRuns)}},getState:()=>({...state}),validate(){const samples=[80,120,160,200,240,280,320,360].map(row=>computeSlice(row,4,true,3)),legRuns=rowRuns(VIEWS[0],330,0),cornerAlpha=referenceData[3],bodyAlpha=referenceData[((120*referenceCanvas.width)+128)*4+3];const checks={version:VERSION==='1.0.1',sourceSize:reference.naturalWidth===1280&&reference.naturalHeight===440,transparentBackground:cornerAlpha===0&&bodyAlpha>127,viewCount:VIEWS.length===5,targetHeight:CELL.targetHeight===400,samplesNonEmpty:samples.every(sample=>sample.area>0),transparentGapExcluded:legRuns.length===2&&runPixelCount(legRuns)<runExtent(legRuns),volumeBuilt:volumePoints.length>1000};return{version:VERSION,checks,pass:Object.values(checks).every(Boolean),samples:samples.map(sample=>({row:sample.row,area:sample.area}))}}});
const validation=window.bodySlicer.validate();if(!validation.pass)throw new Error(`Body Slicer v1 validation failed: ${JSON.stringify(validation)}`);window.__BODY_SLICER_READY__=true;
