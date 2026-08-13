import {createSkeletonMechanicsV23} from './skeleton-mechanics-v23.js?v=20260813-arm-solver';
import {createBodyVolumeV1} from './character-body-volume-v1.js?v=20260813-body-volume-v1';
import {createMuscleVolumeV1} from './character-muscle-volume-v1.js?v=20260813-muscle-volume-v1';

let capturedScene=null;
const THREE=await import('three');
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
const mod=await import('./skeleton-v16.js?v=20260813-arm-solver');
THREE.Scene.prototype.add=originalSceneAdd;
const scene=capturedScene,api=mod.skeletonAPI;if(!scene||!api)throw new Error('Skeleton v1.6 preview: API missing');
const mechanics=createSkeletonMechanicsV23(api);window.skeletonAPI=api;window.skeletonMechanics=mechanics;
const bodyVolume=createBodyVolumeV1(api,{opacity:.42});window.bodyVolume=bodyVolume;
const muscleVolume=createMuscleVolumeV1(api,{opacity:.90});window.muscleVolume=muscleVolume;
for(const method of ['setArmPose','setLegPose','setTorsoPose','setJawPose','setBodyPose','groundToFloor','reset']){const original=mechanics[method]?.bind(mechanics);if(original)mechanics[method]=(...args)=>{const result=original(...args);muscleVolume.update();return result}}
const title=document.querySelector('.info .title'),subtitle=document.querySelector('.info .sub');if(title)title.textContent='Muscle Volume v1';if(subtitle)subtitle.innerHTML='плечевой пояс и руки · обычный взрослый<br>Skeleton 1.6 · Mechanics 2.3 · Body Volume 1';

const definitions={
 arm:[
  ['shoulderFlexion','Плечо вперёд',-35,160],['shoulderAbduction','Плечо вбок',-25,150],['shoulderRotation','Поворот плеча',-65,75],
  ['elbowFlexion','Сгиб локтя',0,145],['forearmRotation','Предплечье',-75,85],['wristFlexion','Сгиб кисти',-60,70],['wristDeviation','Отклонение кисти',-20,30],
  ['fingerCurl','Сжатие пальцев',0,100],['fingerSpread','Разведение пальцев',0,18],['thumbOpposition','Оппозиция большого',0,45],['thumbCurl','Сгиб большого',0,70]
 ],
 leg:[
  ['hipFlexion','Бедро вперёд',-18,120],['hipAbduction','Бедро вбок',-20,40],['hipRotation','Поворот бедра',-35,45],['kneeFlexion','Сгиб колена',0,138],
  ['ankleFlexion','Голеностоп',-50,20],['subtalarInversion','Наклон стопы',-10,25],['subtalarRotation','Поворот стопы',-10,10],['toeFlexion','Пальцы стопы',-45,35]
 ],
 torso:[
  ['pelvisTilt','Наклон таза',-10,15],['pelvisSide','Перекос таза',-8,8],['pelvisRotation','Поворот таза',-10,10],
  ['lumbarFlexion','Поясница сгиб',-15,30],['lumbarSide','Поясница вбок',-20,20],['lumbarRotation','Поясница поворот',-8,8],
  ['thoracicFlexion','Грудной сгиб',-15,30],['thoracicSide','Грудной вбок',-20,20],['thoracicRotation','Грудной поворот',-30,30],
  ['neckFlexion','Шея сгиб',-45,45],['neckSide','Шея вбок',-35,35],['neckRotation','Шея поворот',-65,65],['headFlexion','Голова сгиб',-15,15],['headRotation','Голова поворот',-10,10]
 ],
 jaw:[['open','Открытие',0,35],['protrusion','Вперёд, мм',-2,6],['lateral','Вбок, мм',-6,6]]
};
const fields={};
function chooseView(view){document.querySelector(`[data-view="${view}"]`)?.click()}
function smartView(group,key){
 if(group==='arm'&&key==='shoulderFlexion')chooseView('side');
 else if(group==='arm'&&key==='shoulderAbduction')chooseView('front');
 else if(group==='leg'&&(key==='hipFlexion'||key==='kneeFlexion'||key==='ankleFlexion'||key==='toeFlexion'))chooseView('side');
 else if(group==='leg'&&key==='hipAbduction')chooseView('front');
}
function build(group,id){const root=document.getElementById(id);for(const [key,label,min,max] of definitions[group]){const row=document.createElement('label');row.className='control-row';row.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" value="0" step="1"><span class="value">0°</span>`;const input=row.querySelector('input'),out=row.querySelector('.value');fields[group+':'+key]={input,out,key,group};input.addEventListener('input',()=>{smartView(group,key);apply(group)});root.appendChild(row)}}
build('arm','armControls');build('leg','legControls');build('torso','torsoControls');build('jaw','jawControls');
const sideEl=document.getElementById('mechanicsSide'),status=document.getElementById('mechanicsStatus');
function values(group){const v={};for(const [id,f] of Object.entries(fields))if(f.group===group)v[f.key]=Number(f.input.value);return v}
function sync(group,state){for(const f of Object.values(fields))if(f.group===group&&state[f.key]!==undefined){f.input.value=String(Math.round(state[f.key]*10)/10);f.out.textContent=(Math.round(state[f.key]*10)/10)+(f.key==='protrusion'||f.key==='lateral'?' мм':'°')}}
function apply(group){
 let result;if(group==='arm')result=mechanics.setArmPose(sideEl.value,values(group));if(group==='leg')result=mechanics.setLegPose(sideEl.value,values(group));if(group==='torso')result=mechanics.setTorsoPose(values(group));if(group==='jaw')result=mechanics.setJawPose(values(group));
 sync(group,result);const n=result.constraints?.length??0;if(n)status.textContent=`ограничено: ${n}`;else if(group==='arm'&&result.automaticShoulderRotation>0)status.textContent=`автоповорот плеча +${Math.round(result.automaticShoulderRotation)}°`;else status.textContent='в пределах нормы';
}
function loadSide(){const state=mechanics.getState();sync('arm',state.arms[sideEl.value]);sync('leg',state.legs[sideEl.value])}
sideEl.addEventListener('change',loadSide);
const bodyToggle=document.getElementById('toggleBodyVolume'),muscleToggle=document.getElementById('toggleMuscleVolume'),skeletonToggle=document.getElementById('toggleSkeletonLayer'),bodyOpacity=document.getElementById('bodyOpacity');
let bodyVisible=true,muscleVisible=true,skeletonVisible=true;
function syncLayerButtons(){bodyToggle?.classList.toggle('active',bodyVisible);muscleToggle?.classList.toggle('active',muscleVisible);skeletonToggle?.classList.toggle('active',skeletonVisible)}
if(bodyToggle)bodyToggle.onclick=()=>{bodyVisible=!bodyVisible;bodyVolume.setVisible(bodyVisible);syncLayerButtons()};
if(muscleToggle)muscleToggle.onclick=()=>{muscleVisible=!muscleVisible;muscleVolume.setVisible(muscleVisible);syncLayerButtons()};
if(skeletonToggle)skeletonToggle.onclick=()=>{skeletonVisible=!skeletonVisible;bodyVolume.setSkeletonVisible(skeletonVisible);syncLayerButtons()};
if(bodyOpacity)bodyOpacity.addEventListener('input',()=>bodyVolume.setOpacity(Number(bodyOpacity.value)));
syncLayerButtons();
document.getElementById('resetMechanics').onclick=()=>{mechanics.reset();for(const f of Object.values(fields)){f.input.value='0';f.out.textContent=f.key==='protrusion'||f.key==='lateral'?'0 мм':'0°'}status.textContent='нейтральная поза'};
document.getElementById('groundMechanics').onclick=()=>{mechanics.groundToFloor();status.textContent='стопы опущены к полу'};
const mechanicsPanel=document.getElementById('mechanicsPanel'),panelToggle=document.getElementById('toggleMechanicsPanel');
function setPanelCompact(compact){mechanicsPanel.classList.toggle('compact',compact);panelToggle.textContent=compact?'Развернуть':'Свернуть'}
panelToggle.onclick=()=>setPanelCompact(!mechanicsPanel.classList.contains('compact'));
if(matchMedia('(max-width:900px)').matches)setPanelCompact(true);
const bodyDiagnostics=bodyVolume.getDiagnostics(),muscleDiagnostics=muscleVolume.getDiagnostics(),metrics=document.getElementById('metrics');metrics.insertAdjacentHTML('beforeend',`<div class="row"><span>Mechanics</span><span>v2.3 coordinated arm</span></div><div class="row"><span>Body volume</span><span>v1 · ${bodyDiagnostics.partCount} analytic parts</span></div><div class="row"><span>Muscles</span><span>v1 · ${muscleDiagnostics.muscleCount} dynamic paths</span></div><div class="row"><span>Muscle volume</span><span>length ↔ thickness coupling</span></div><div class="row"><span>Scapula cover</span><span>mobile soft-tissue pads</span></div><div class="row"><span>Shoulder</span><span>swing + axial twist</span></div><div class="row"><span>Limits</span><span>active coupled ROM</span></div>`);
window.__MECHANICS_READY__=true;status.textContent='в пределах нормы';
