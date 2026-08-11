const ASSET_URL='./assets/body_base_v0_9.png';
let imagePromise;

function loadBody(){
  if(!imagePromise){
    imagePromise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=ASSET_URL;
    });
  }
  return imagePromise;
}

export async function drawBodyBase(ctx,canvas,{debug=false}={}){
  const img=await loadBody();
  ctx.imageSmoothingEnabled=false;
  const x=Math.round((canvas.width-img.width)/2);
  const y=Math.round((canvas.height-img.height)/2);
  ctx.drawImage(img,x,y);

  if(debug){
    ctx.save();
    ctx.strokeStyle='rgba(130,255,170,.75)';
    ctx.fillStyle='rgba(130,255,170,.95)';
    ctx.lineWidth=1;
    const anchors=[
      ['head',120,31],['neck',120,78],['shoulderL',91,103],['shoulderR',149,103],
      ['waist',120,186],['hipL',98,224],['hipR',142,224],['kneeL',102,300],['kneeR',138,300],
      ['ankleL',105,365],['ankleR',135,365]
    ];
    for(const [name,ax,ay] of anchors){
      ctx.fillRect(ax-1,ay-1,3,3);
      ctx.fillText(name,ax+4,ay-3);
    }
    ctx.restore();
  }
}
