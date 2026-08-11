let minutes=490;
let speed=1;
let timer;
let clothingLayerIndex=3;

const clothingLayers=[
  'Тело · слой 0',
  'Нижнее бельё · слой 10',
  'Чулочно-носочный · слой 20',
  'Основная одежда · слой 40',
  'Дополнительный · слой 50',
  'Верхняя одежда · слой 60',
  'Аксессуары · слой 70'
];

const clock=document.querySelector('#clock');
const toast=document.querySelector('#toast');
const layerControl=document.querySelector('#layerControl');
const layerName=document.querySelector('#layerName');

function time(){
  return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}

function render(){
  const current=time();
  clock.textContent=current;
  document.querySelector('#phoneTime').textContent=current;
  document.querySelector('#phoneBigTime').textContent=current;
}

function run(){
  clearInterval(timer);
  if(speed) timer=setInterval(()=>{
    minutes=(minutes+speed)%1440;
    render();
  },1500);
}

function say(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(say.t);
  say.t=setTimeout(()=>toast.classList.remove('show'),1400);
}

function renderLayer(){
  layerName.textContent=clothingLayers[clothingLayerIndex];
}

document.querySelectorAll('.speed button').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('.speed button').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    speed=+button.dataset.speed;
    run();
  };
});

document.querySelectorAll('.nav button').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('.nav button').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    document.querySelector('#'+button.dataset.screen).classList.add('active');
  };
});

document.querySelector('#look').onclick=()=>{
  document.querySelector('#worldText').textContent='У подъезда пусто. В нескольких окнах горит свет, где-то наверху хлопнула дверь.';
  minutes++;
  render();
};

document.querySelector('#enter').onclick=()=>{
  document.querySelector('#worldText').textContent='Ты заходишь в подъезд. Пахнет прохладным бетоном и утренним кофе из одной из квартир.';
  minutes+=2;
  render();
  say('Локация изменена');
};

document.querySelectorAll('.ios-app').forEach(button=>{
  button.onclick=()=>say(button.id==='navigator'?'Навигатор: пока открыт только твой дом':button.dataset.name+' — приложение появится позже');
});

document.querySelectorAll('.me-tabs button').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('.me-tabs button').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    document.querySelector('#meDetail').textContent=button.dataset.detail;
  };
});

document.querySelectorAll('.round-action').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('.round-action').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    const isClothes=button.dataset.view==='clothes';
    layerControl.classList.toggle('visible',isClothes);
    say(button.dataset.view==='look'?'Внешний вид':isClothes?'Слои одежды':'Тело');
  };
});

document.querySelector('#layerUp').onclick=()=>{
  clothingLayerIndex=Math.min(clothingLayers.length-1,clothingLayerIndex+1);
  renderLayer();
};

document.querySelector('#layerDown').onclick=()=>{
  clothingLayerIndex=Math.max(0,clothingLayerIndex-1);
  renderLayer();
};

renderLayer();
render();
run();