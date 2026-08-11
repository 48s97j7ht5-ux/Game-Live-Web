import {DEFAULT} from './data/presets.js';
import {drawLayeredCharacter} from './renderer/layeredRenderer.js';

const canvas=document.getElementById('characterCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const ids=['height','shoulders','waist','hips'];
const controls=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const outputs=Object.fromEntries(ids.map(id=>[id,document.getElementById(id+'O')]));
const layerIds=['hair','underwear','face','shading'];
const layerControls=Object.fromEntries(layerIds.map(id=>[id,document.getElementById(id)]));
const state={...DEFAULT};
let renderToken=0;

function sync(){ids.forEach(id=>state[id]=+controls[id].value);}
function debugState(){return Object.fromEntries(layerIds.map(id=>[id,layerControls[id]?.checked!==false]));}

function paintStage(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#202530';ctx.fillRect(0,0,canvas.width,304);
  ctx.fillStyle='#151922';ctx.fillRect(0,304,canvas.width,96);
}

async function render(){
  const token=++renderToken;
  sync();paintStage();
  await drawLayeredCharacter(ctx,canvas,state,debugState());
  if(token!==renderToken)return;
  outputs.height.textContent=`${state.height} см`;
  outputs.shoulders.textContent=`${state.shoulders}%`;
  outputs.waist.textContent=`${state.waist}%`;
  outputs.hips.textContent=`${state.hips}%`;
}

ids.forEach(id=>controls[id].addEventListener('input',render));
layerIds.forEach(id=>layerControls[id]?.addEventListener('change',render));
document.getElementById('bodyOnly')?.addEventListener('click',()=>{layerIds.forEach(id=>{if(layerControls[id])layerControls[id].checked=false;});render();});
document.getElementById('allLayers')?.addEventListener('click',()=>{layerIds.forEach(id=>{if(layerControls[id])layerControls[id].checked=true;});render();});
document.getElementById('reset').addEventListener('click',()=>{ids.forEach(id=>controls[id].value=DEFAULT[id]);render();});
render();
