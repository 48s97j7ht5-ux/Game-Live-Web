let minutes=490;
let speed=1;
let timer;
let clothingLayerIndex=3;
let clothingSlotsVisible=true;

const clothingLayers=[
  {name:'Тело · слой 0',slots:[{anchor:'chest-left'},{anchor:'waist-left'},{anchor:'thigh-right'},{anchor:'foot-right'}]},
  {name:'Нижнее бельё · слой 10',slots:[{anchor:'chest-left',icon:'◒',name:'Бельё'},{anchor:'waist-left',icon:'▱',name:'Трусы'},{anchor:'chest-right'},{anchor:'waist-right'}]},
  {name:'Чулочно-носочный · слой 20',slots:[{anchor:'thigh-left',icon:'▥',name:'Колготки'},{anchor:'calf-left',icon:'▥',name:'Носки'},{anchor:'thigh-right'},{anchor:'calf-right'}]},
  {name:'Основная одежда · слой 40',slots:[{anchor:'chest-left',icon:'T',name:'Футболка'},{anchor:'waist-left',icon:'Ⅱ',name:'Джинсы'},{anchor:'chest-right'},{anchor:'waist-right'}]},
  {name:'Дополнительный · слой 50',slots:[{anchor:'chest-left',icon:'⌑',name:'Худи'},{anchor:'chest-right'},{anchor:'waist-left'},{anchor:'waist-right'}]},
  {name:'Верхняя одежда · слой 60',slots:[{anchor:'chest-left',icon:'▤',name:'Куртка'},{anchor:'chest-right'},{anchor:'waist-left'},{anchor:'waist-right'}]},
  {name:'Аксессуары · слой 70',slots:[{anchor:'head-left',icon:'○',name:'Очки'},{anchor:'head-right'},{anchor:'chest-left',icon:'○',name:'Цепочка'},{anchor:'waist-right',icon:'○',name:'Часы'}]}
];

const clock=document.querySelector('#clock');
const toast=document.querySelector('#toast');
const layerControl=document.querySelector('#layerControl');
const clothingSlots=document.querySelector('#clothingSlots');
const toggleSlots=document.querySelector('#toggleSlots');
const meTabs=[...document.querySelectorAll('.me-tabs button')];

function time(){return String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')}
function render(){const current=time();clock.textContent=current;document.querySelector('#phoneTime').textContent=current;document.querySelector('#phoneBigTime').textContent=current}
function run(){clearInterval(timer);if(speed){timer=setInterval(()=>{minutes=(minutes+speed)%1440;render()},1500)}}
function say(text){toast.textContent=text;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),1400)}

function applySlotVisibility(){
  clothingSlots.classList.toggle('hidden-by-user',!clothingSlotsVisible);
  toggleSlots.classList.toggle('active',clothingSlotsVisible);
  toggleSlots.setAttribute('aria-pressed',String(clothingSlotsVisible));
  toggleSlots.setAttribute('aria-label',clothingSlotsVisible?'Скрыть ячейки':'Показать ячейки');
  toggleSlots.textContent=clothingSlotsVisible?'◉':'○';
}

function setClothingMode(enabled){
  layerControl.classList.toggle('visible',enabled);
  clothingSlots.classList.toggle('visible',enabled);
  if(enabled){renderLayer();applySlotVisibility()}
}

function renderLayer(){
  const layer=clothingLayers[clothingLayerIndex];
  clothingSlots.innerHTML='';
  layer.slots.forEach(slot=>{
    const button=document.createElement('button');
    const filled=Boolean(slot.name);
    button.type='button';
    button.className=`clothing-slot ${filled?'filled':'empty'} anchor-${slot.anchor}`;
    if(filled){
      button.innerHTML=`<span class="item-icon">${slot.icon}</span><span class="item-name">${slot.name}</span>`;
      button.addEventListener('click',()=>say(slot.name+' · текущий предмет'));
    }else{
      button.innerHTML='<span class="item-icon">＋</span><span class="item-name">Пусто</span>';
      button.addEventListener('click',()=>say('Свободная ячейка'));
    }
    clothingSlots.appendChild(button);
  });
  applySlotVisibility();
}

function changeLayer(delta){
  const next=Math.max(0,Math.min(clothingLayers.length-1,clothingLayerIndex+delta));
  if(next===clothingLayerIndex){say(delta>0?'Это самый внешний слой':'Это слой тела');return}
  clothingLayerIndex=next;
  renderLayer();
  say(clothingLayers[clothingLayerIndex].name);
}

document.querySelectorAll('.speed button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.speed button').forEach(item=>item.classList.remove('active'));button.classList.add('active');speed=+button.dataset.speed;run()}));
document.querySelectorAll('.nav button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(item=>item.classList.remove('active'));document.querySelectorAll('.screen').forEach(item=>item.classList.remove('active'));button.classList.add('active');document.querySelector('#'+button.dataset.screen).classList.add('active')}));
document.querySelector('#look').addEventListener('click',()=>{document.querySelector('#worldText').textContent='У подъезда пусто. В нескольких окнах горит свет, где-то наверху хлопнула дверь.';minutes++;render()});
document.querySelector('#enter').addEventListener('click',()=>{document.querySelector('#worldText').textContent='Ты заходишь в подъезд. Пахнет прохладным бетоном и утренним кофе из одной из квартир.';minutes+=2;render();say('Локация изменена')});
document.querySelectorAll('.ios-app').forEach(button=>button.addEventListener('click',()=>say(button.id==='navigator'?'Навигатор: пока открыт только твой дом':button.dataset.name+' — приложение появится позже')));

meTabs.forEach((button,index)=>button.addEventListener('click',()=>{meTabs.forEach(item=>item.classList.remove('active'));button.classList.add('active');document.querySelector('#meDetail').textContent=button.dataset.detail;setClothingMode(index===1)}));
document.querySelector('#layerUp').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();changeLayer(1)});
document.querySelector('#layerDown').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();changeLayer(-1)});
toggleSlots.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();clothingSlotsVisible=!clothingSlotsVisible;applySlotVisibility();say(clothingSlotsVisible?'Ячейки показаны':'Ячейки скрыты')});

renderLayer();
render();
run();