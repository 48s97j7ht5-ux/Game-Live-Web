import {drawBodyBase} from './renderer/bodyRigV09.js?v=9.2';

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
  try{
    await drawBodyBase(ctx,canvas,{debug:debug.checked});
  }catch(err){
    console.error('body_base render failed',err);
    ctx.fillStyle='#ff8f8f';
    ctx.font='12px monospace';
    ctx.fillText('body_base load error',18,28);
  }
}

debug.addEventListener('change',render);
render();
