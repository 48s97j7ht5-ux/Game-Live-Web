import {drawBodyBase} from './renderer/bodyRigV09.js';

const canvas=document.getElementById('characterCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const debug=document.getElementById('debugAnchors');

function paintStage(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#202530';
  ctx.fillRect(0,0,canvas.width,304);
  ctx.fillStyle='#151922';
  ctx.fillRect(0,304,canvas.width,96);
}

async function render(){
  paintStage();
  await drawBodyBase(ctx,canvas,{debug:debug.checked});
}

debug.addEventListener('change',render);
render();
