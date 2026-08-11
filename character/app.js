import {DEFAULT} from './data/presets.js';
import {drawReference} from './renderer/referenceRenderer.js';

const canvas=document.getElementById('characterCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const ids=['height','shoulders','waist','hips'];
const controls=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const outputs=Object.fromEntries(ids.map(id=>[id,document.getElementById(id+'O')]));
const state={...DEFAULT};
let renderToken=0;

function sync(){
  ids.forEach(id=>state[id]=+controls[id].value);
}

function paintStage(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#202530';
  ctx.fillRect(0,0,canvas.width,304);
  ctx.fillStyle='#151922';
  ctx.fillRect(0,304,canvas.width,96);
}

async function render(){
  const token=++renderToken;
  sync();
  paintStage();
  await drawReference(ctx,canvas,state);
  if(token!==renderToken) return;

  outputs.height.textContent=`${state.height} см`;
  outputs.shoulders.textContent=`${state.shoulders}%`;
  outputs.waist.textContent=`${state.waist}%`;
  outputs.hips.textContent=`${state.hips}%`;
}

ids.forEach(id=>controls[id].addEventListener('input',render));
document.getElementById('reset').addEventListener('click',()=>{
  ids.forEach(id=>controls[id].value=DEFAULT[id]);
  render();
});

render();
