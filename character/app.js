import {DEFAULT} from './data/presets.js';
import {compose} from './renderer/compose.js';
import {palette,draw} from './renderer/raster.js';

const canvas=document.getElementById('characterCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const ids=['height','shoulders','waist','hips','skin'];
const controls=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const outputs=Object.fromEntries(ids.map(id=>[id,document.getElementById(id+'O')]));
const state={...DEFAULT};

function sync(){
  ids.forEach(id=>state[id]=+controls[id].value);
}
function paintStage(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#202530';ctx.fillRect(0,0,canvas.width,304);
  ctx.fillStyle='#151922';ctx.fillRect(0,304,canvas.width,96);
}
function render(){
  sync();paintStage();
  const buf=compose(state),pal=palette(state.skin);
  draw(ctx,buf,pal,2);
  outputs.height.textContent=`${state.height} см`;
  outputs.shoulders.textContent=`${state.shoulders}%`;
  outputs.waist.textContent=`${state.waist}%`;
  outputs.hips.textContent=`${state.hips}%`;
  outputs.skin.textContent=`${state.skin}%`;
}
ids.forEach(id=>controls[id].addEventListener('input',render));
document.getElementById('reset').addEventListener('click',()=>{ids.forEach(id=>controls[id].value=DEFAULT[id]);render();});
render();
