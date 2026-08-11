let minutes=490;
let speed=1;
let timer;
let clothingLayerIndex=3;

const clothingLayers=[
  {name:'Тело · слой 0',items:[]},
  {name:'Нижнее бельё · слой 10',items:[{icon:'◒',name:'Бельё'}]},
  {name:'Чулочно-носочный · слой 20',items:[{icon:'▥',name:'Носки'}]},
  {name:'Основная одежда · слой 40',items:[{icon:'T',name:'Футболка'},{icon:'Ⅱ',name:'Джинсы'}]},
  {name:'Дополнительный · слой 50',items:[{icon:'⌑',name:'Худи'}]},
  {name:'Верхняя одежда · слой 60',items:[{icon:'▤',name:'Куртка'}]},
  {name:'Аксессуары · слой 70',items:[{icon:'○',name:'Часы'}]}
];

const clock=document.querySelector('#clock');
const toast=document.querySelector('#toast');
const layerControl=document.querySelector('#layerControl');
const layerName=document.querySelector('#layerName');
const clothingSlots=document.querySelector('#clothingSlots');

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
  const layer=clothingLayers[clothingLayerIndex];
  layerName.textContent=layer.name;
  clothingSlots.innerHTML='';

  const cells=[...layer.items];
  while(cells.length<4) cells.push(null);

  cells.slice(0,4).forEach(item=>{
    const button=document.createElement('button');
    button.className='clothing-slot '+(item?'filled':'empty');
    if(item){
      button.innerHTML=`<span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span>`;
      button.onclick=()=>say(item.name+' · текущий предмет');
    }else{
      button.innerHTML='<span class="item-icon">＋</span><span class="item-name">Пусто</span>';
      button.onclick=()=>say('Свободная ячейка');
    }
    clothingSlots.appendChild(button);
  });
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
    clothingSlots.classList.toggle('visible',isClothes);
    if(isClothes) renderLayer();
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