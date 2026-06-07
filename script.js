
const m=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let month=new Date().getMonth(), selected='';
const db=()=>JSON.parse(localStorage.getItem('traderPro')||'{}');
const saveDb=d=>localStorage.setItem('traderPro',JSON.stringify(d));
let selectedDayKeys=new Set();
let advancedSelectionActive=false;
let dragSelecting=false;
let selectionMouseupBound=false;

function totals(){
 let all=0, yearTotal=0, y=year.value;
 let d=db();
 Object.entries(d).forEach(([k,v])=>{
  all+=Number(v.result||0);
  if(k.startsWith(y+'-')) yearTotal+=Number(v.result||0);
 });
 annualTotal.innerText='R$ '+yearTotal.toFixed(2);
 allTimeTotal.innerText='R$ '+all.toFixed(2);
}

function render(){
 let y=parseInt(year.value);
 monthLabel.innerText=m[month]+'/'+y;
 calendar.innerHTML='';
 let first=new Date(y,month,1).getDay();
 let days=new Date(y,month+1,0).getDate();
 for(let i=0;i<first;i++){let e=document.createElement('div');e.className='day empty';calendar.appendChild(e);}
 let d=db();
 for(let day=1;day<=days;day++){
   let key=`${y}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   let v=d[key]||{};
   let c=document.createElement('div');
   c.className='day';
   if((v.result||0)>0)c.classList.add('positive');
   if((v.result||0)<0)c.classList.add('negative');
   if(v.dayType==='holiday')c.classList.add('holiday');
   if(v.dayType==='notOperated')c.classList.add('not-operated');
   c.innerHTML=`<div class=date>${day}</div><div class=value>${v.result?'R$ '+Number(v.result).toFixed(2):''}</div><div>${v.points?Number(v.points)+' pts':''}</div><div>${v.ops?Number(v.ops)+' ops':''}</div><div>${v.dayType==='holiday'?'Feriado':v.dayType==='notOperated'?'Dia não Operado':''}</div>`;
   c.onclick=()=>openModal(key,v);
   calendar.appendChild(c);
 }
 totals();
}

function openModal(k,v){selected=k;modal.classList.remove('hidden');dateTitle.innerText=k;result.value=v.result||'';points.value=v.points||'';ops.value=v.ops||'';dayType.value=v.dayType||'';}
save.onclick=()=>{let d=db();d[selected]={result:+result.value||0,points:+points.value||0,ops:+ops.value||0,dayType:dayType.value||''};saveDb(d);modal.classList.add('hidden');render();}
clearDay.onclick=()=>{let d=db();delete d[selected];saveDb(d);result.value='';points.value='';ops.value='';dayType.value='';modal.classList.add('hidden');render();}
close.onclick=()=>modal.classList.add('hidden');
prev.onclick=()=>{month=(month+11)%12;render()}
next.onclick=()=>{month=(month+1)%12;render()}
year.onchange=render;
render();


function formatBRL(v){
 return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

const _oldTotals = totals;
totals = function(){
 let all=0, yearTotal=0, y=year.value;
 let d=db();
 Object.entries(d).forEach(([k,v])=>{
  all+=Number(v.result||0);
  if(k.startsWith(y+'-')) yearTotal+=Number(v.result||0);
 });
 annualTotal.innerText=formatBRL(yearTotal);
 allTimeTotal.innerText=formatBRL(all);
}

const _oldRender = render;
render = function(){
 let y=parseInt(year.value);
 monthLabel.innerText=m[month]+'/'+y;
 calendar.innerHTML='';
 let first=new Date(y,month,1).getDay();
 let days=new Date(y,month+1,0).getDate();
 for(let i=0;i<first;i++){let e=document.createElement('div');e.className='day empty';calendar.appendChild(e);}
 let d=db();
 for(let day=1;day<=days;day++){
   let key=`${y}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   let v=d[key]||{};
   let c=document.createElement('div');
   c.className='day';
   if((v.result||0)>0)c.classList.add('positive');
   if((v.result||0)<0)c.classList.add('negative');
   if(v.dayType==='holiday')c.classList.add('holiday');
   if(v.dayType==='notOperated')c.classList.add('not-operated');
   c.innerHTML=`<div class=date>${day}</div><div class=value>${v.result?formatBRL(v.result):''}</div><div>${v.points?Number(v.points)+' pts':''}</div><div>${v.ops?Number(v.ops)+' ops':''}</div><div>${v.dayType==='holiday'?'Feriado':v.dayType==='notOperated'?'Dia não Operado':''}</div>`;
   c.onclick=()=>openModal(key,v);
   calendar.appendChild(c);
 }
 totals();
}
render();



function isWeekend(y,mth,d){
 return new Date(y,mth,d).getDay()===0 || new Date(y,mth,d).getDay()===6;
}

const originalRender = render;
render = function(){
 let y=parseInt(year.value);
 monthLabel.innerText=m[month]+'/'+y;
 calendar.innerHTML='';
 let first=new Date(y,month,1).getDay();
 let days=new Date(y,month+1,0).getDate();

 for(let i=0;i<first;i++){
   let e=document.createElement('div');
   e.className='day empty';
   calendar.appendChild(e);
 }

 let data=db();

 for(let day=1;day<=days;day++){
   let key=`${y}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   let v=data[key]||{};
   let c=document.createElement('div');
   c.dataset.date=key;

   if(isWeekend(y,month,day)){
      c.className='day weekend';
      c.innerHTML=`<div class=date>${day}</div><div>Mercado<br>Fechado</div>`;
   }else{
      c.className='day';
      if((v.result||0)>0)c.classList.add('positive');
      if((v.result||0)<0)c.classList.add('negative');
      if(v.dayType==='holiday')c.classList.add('holiday');
      if(v.dayType==='notOperated')c.classList.add('not-operated');
      c.innerHTML=`<div class=date>${day}</div>
      <div class=value>${v.result?formatBRL(v.result):''}</div>
      <div>${v.points?Number(v.points)+' pts':''}</div>
      <div>${v.ops?Number(v.ops)+' ops':''}</div>
      <div>${v.dayType==='holiday'?'Feriado':v.dayType==='notOperated'?'Dia não Operado':''}</div>`;
      c.onclick=()=>{if(!advancedSelectionActive) openModal(key,v);}
   }
   if(selectedDayKeys.has(key)) c.classList.add('selected-day');
   calendar.appendChild(c);
 }
 totals();
 updateQuarterResults(data);
 updateAdvancedResults(data);
 attachDaySelectionEvents();
 drawCharts();
}

let equityChartInstance=null;
let monthlyChartInstance=null;
let annualSparklineInstance=null;
let allTimeSparklineInstance=null;

function drawCharts(){
 const data=db();
 const selectedYear=year.value;
 const keys=Object.keys(data).filter(k=>k.startsWith(selectedYear+'-')).sort();

 let acc=0;
 let labels=[];
 let equity=[];

 keys.forEach(k=>{
   acc+=Number(data[k].result||0);
   labels.push(k);
   equity.push(acc);
 });

 const ectx=document.getElementById('equityChart');
 if(ectx){
   if(equityChartInstance) equityChartInstance.destroy();
   equityChartInstance=new Chart(ectx,{
      type:'line',
      data:{labels:labels,datasets:[{label:'Capital Acumulado',data:equity,tension:.3}]},
      options:{responsive:true}
   });
 }

 let monthly=new Array(12).fill(0);
 keys.forEach(k=>{
   const dt=new Date(k+'T00:00:00');
   monthly[dt.getMonth()]+=Number(data[k].result||0);
 });

 const mctx=document.getElementById('monthlyChart');
 if(mctx){
   if(monthlyChartInstance) monthlyChartInstance.destroy();
   monthlyChartInstance=new Chart(mctx,{
      type:'bar',
      data:{labels:m,datasets:[{label:'Resultado Mensal',data:monthly}]},
      options:{responsive:true}
   });
 }
}

render();


// ===== MELHORIAS VISUAIS AUTOMÁTICAS =====
function drawCharts(){
 const data=db();
 const selectedYear=year.value;
 const keys=Object.keys(data).filter(k=>k.startsWith(selectedYear+'-')).sort();

 let acc=0, labels=[], equity=[];
 keys.forEach(k=>{
   acc+=Number(data[k].result||0);
   labels.push(k);
   equity.push(acc);
 });

 const isPositiveCurve=(equity.length===0 || equity[equity.length-1] >= 0);
 const zeroLinePlugin={
   id:'zeroLinePlugin',
   afterDraw(chart){
     const yScale=chart.scales.y;
     const area=chart.chartArea;
     if(!yScale || !area) return;
     const zeroY=yScale.getPixelForValue(0);
     if(zeroY<area.top || zeroY>area.bottom) return;
     const ctx=chart.ctx;
     ctx.save();
     ctx.beginPath();
     ctx.moveTo(area.left,zeroY);
     ctx.lineTo(area.right,zeroY);
     ctx.lineWidth=2;
     ctx.strokeStyle='rgba(255,255,255,.78)';
     ctx.shadowColor='rgba(255,255,255,.45)';
     ctx.shadowBlur=8;
     ctx.stroke();
     ctx.restore();
   }
 };

 const ectx=document.getElementById('equityChart');
 if(ectx){
   if(equityChartInstance) equityChartInstance.destroy();
   const chartGradient=ctx=>{
     const chart=ctx.chart;
     const area=chart.chartArea;
     if(!area) return 'rgba(32,247,164,.2)';
     const g=chart.ctx.createLinearGradient(0,area.top,0,area.bottom);
     g.addColorStop(0,'rgba(32,247,164,.42)');
     g.addColorStop(.48,'rgba(32,247,164,.16)');
     g.addColorStop(.5,'rgba(255,255,255,.02)');
     g.addColorStop(.52,'rgba(255,93,115,.16)');
     g.addColorStop(1,'rgba(255,93,115,.42)');
     return g;
   };
   equityChartInstance=new Chart(ectx,{
      type:'line',
      data:{
        labels,
        datasets:[{
          label:'Capital Acumulado',
          data:equity,
          tension:.28,
          fill:'origin',
          borderWidth:3,
          borderColor:isPositiveCurve ? '#20f7a4' : '#ff5d73',
          backgroundColor:chartGradient,
          pointRadius:0,
          pointHoverRadius:5,
          pointHoverBackgroundColor:'#ffffff',
          pointHoverBorderWidth:2,
          segment:{
            borderColor:ctx=>ctx.p1.parsed.y>=0 ? '#20f7a4' : '#ff5d73',
            backgroundColor:ctx=>ctx.p1.parsed.y>=0 ? 'rgba(32,247,164,.24)' : 'rgba(255,93,115,.24)'
          }
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{intersect:false,mode:'index'},
        plugins:{
          legend:{display:false},
          title:{display:true,text:'Patrimônio',color:'#ffffff',font:{size:16,weight:'700'}},
          tooltip:{
            backgroundColor:'rgba(8,12,22,.94)',
            borderColor:'rgba(255,255,255,.14)',
            borderWidth:1,
            callbacks:{label:ctx=>'Patrimônio: '+formatBRL(ctx.parsed.y)}
          }
        },
        scales:{
          x:{ticks:{display:false},grid:{display:false},border:{display:false}},
          y:{
            beginAtZero:false,
            ticks:{color:'rgba(255,255,255,.52)',callback:value=>formatBRL(value)},
            grid:{color:'rgba(255,255,255,.055)'},
            border:{display:false}
          }
        }
      },
      plugins:[zeroLinePlugin]
   });
 }

 let monthly=new Array(12).fill(0);
 keys.forEach(k=>{
   const dt=new Date(k+'T00:00:00');
   monthly[dt.getMonth()]+=Number(data[k].result||0);
 });

 const colors=monthly.map(v=>v>=0 ? '#00ff66' : '#ff3333');

 const mctx=document.getElementById('monthlyChart');
 if(mctx){
   if(monthlyChartInstance) monthlyChartInstance.destroy();
   monthlyChartInstance=new Chart(mctx,{
      type:'bar',
      data:{
        labels:m,
        datasets:[{
          label:'Resultado Mensal',
          data:monthly,
          backgroundColor:colors,
          borderColor:colors,
          borderWidth:1
        }]
      },
      options:{
        responsive:true,
        plugins:{legend:{labels:{color:'#ffffff'}}},
        scales:{
          x:{ticks:{color:'#cccccc'},grid:{color:'rgba(255,255,255,.08)'}},
          y:{ticks:{color:'#cccccc'},grid:{color:'rgba(255,255,255,.08)'}}
        }
      }
   });
 }

 drawSummaryCards(data,keys);
}
render();

function buildCumulativeSeries(entries,data){
 let acc=0;
 let series=[];
 entries.forEach(k=>{
   acc+=Number(data[k].result||0);
   series.push(acc);
 });
 if(series.length===0) series=[0,0];
 if(series.length===1) series=[0,series[0]];
 return series;
}

function drawSparkline(canvasId,values,total,previousInstance){
 const canvas=document.getElementById(canvasId);
 if(!canvas) return previousInstance;
 if(previousInstance) previousInstance.destroy();
 const positive=Number(total||0)>=0;
 const lineColor=positive ? '#20f7a4' : '#ff2f68';
 const fillTop=positive ? 'rgba(32,247,164,.34)' : 'rgba(255,47,104,.34)';
 const fillBottom=positive ? 'rgba(32,247,164,0)' : 'rgba(255,47,104,0)';
 return new Chart(canvas,{
   type:'line',
   data:{
     labels:values.map((_,i)=>i+1),
     datasets:[{
       data:values,
       tension:.32,
       fill:true,
       borderColor:lineColor,
       borderWidth:2.4,
       pointRadius:0,
       backgroundColor:ctx=>{
         const area=ctx.chart.chartArea;
         if(!area) return fillTop;
         const g=ctx.chart.ctx.createLinearGradient(0,area.top,0,area.bottom);
         g.addColorStop(0,fillTop);
         g.addColorStop(.58,positive ? 'rgba(32,247,164,.12)' : 'rgba(255,47,104,.12)');
         g.addColorStop(1,fillBottom);
         return g;
       }
     }]
   },
   options:{
     responsive:true,
     maintainAspectRatio:false,
     animation:false,
     plugins:{legend:{display:false},tooltip:{enabled:false}},
     scales:{
       x:{display:false},
       y:{display:false}
     },
     elements:{line:{capBezierPoints:true}}
   }
 });
}

function drawSummaryCards(data,keys){
 const y=year.value;
 const yearKeys=keys.filter(k=>k.startsWith(y+'-'));
 const yearSeries=buildCumulativeSeries(yearKeys,data);
 const allSeries=buildCumulativeSeries(keys,data);
 const yearTotal=yearSeries[yearSeries.length-1]||0;
 const allTotal=allSeries[allSeries.length-1]||0;
 annualSparklineInstance=drawSparkline('annualSparkline',yearSeries,yearTotal,annualSparklineInstance);
 allTimeSparklineInstance=drawSparkline('allTimeSparkline',allSeries,allTotal,allTimeSparklineInstance);
}

function updateQuarterResults(data){
 const selectedYear=year.value;
 const totals=[0,0,0,0];
 Object.entries(data).forEach(([key,value])=>{
   if(!key.startsWith(selectedYear+'-')) return;
   const monthIndex=Number(key.slice(5,7))-1;
   const quarterIndex=Math.floor(monthIndex/3);
   if(quarterIndex>=0 && quarterIndex<4){
     totals[quarterIndex]+=Number(value.result||0);
   }
 });
 totals.forEach((total,index)=>{
   const valueEl=document.getElementById('quarterTotal'+(index+1));
   const cardEl=valueEl ? valueEl.closest('.quarterCard') : null;
   if(valueEl) valueEl.innerText=formatBRL(total);
   if(cardEl){
     cardEl.classList.toggle('positiveQuarter',total>=0);
     cardEl.classList.toggle('negativeQuarter',total<0);
   }
 });
}

function getSelectedMonths(){
 return Array.from(document.querySelectorAll('#monthSelector input:checked')).map(input=>Number(input.value));
}

function updateAdvancedResults(data){
 const selectedYear=year.value;
 let dayTotal=0;
 selectedDayKeys.forEach(key=>{
   dayTotal+=Number((data[key]||{}).result||0);
 });
 const selectedDaysTotal=document.getElementById('selectedDaysTotal');
 const selectedDaysCount=document.getElementById('selectedDaysCount');
 if(selectedDaysTotal){
   selectedDaysTotal.innerText=formatBRL(dayTotal);
   selectedDaysTotal.classList.toggle('is-negative',dayTotal<0);
 }
 if(selectedDaysCount) selectedDaysCount.innerText=selectedDayKeys.size;

 const selectedMonths=getSelectedMonths();
 let monthTotal=0;
 Object.entries(data).forEach(([key,value])=>{
   if(!key.startsWith(selectedYear+'-')) return;
   const monthIndex=Number(key.slice(5,7))-1;
   if(selectedMonths.includes(monthIndex)){
     monthTotal+=Number(value.result||0);
   }
 });
 const selectedMonthsTotal=document.getElementById('selectedMonthsTotal');
 const selectedMonthsCount=document.getElementById('selectedMonthsCount');
 if(selectedMonthsTotal){
   selectedMonthsTotal.innerText=formatBRL(monthTotal);
   selectedMonthsTotal.classList.toggle('is-negative',monthTotal<0);
 }
 if(selectedMonthsCount) selectedMonthsCount.innerText=selectedMonths.length;
}

function selectDayElement(dayEl){
 const key=dayEl.dataset.date;
 if(!key) return;
 selectedDayKeys.add(key);
 dayEl.classList.add('selected-day');
 updateAdvancedResults(db());
}

function attachDaySelectionEvents(){
 document.body.classList.toggle('selection-active',advancedSelectionActive);
 document.querySelectorAll('.day[data-date]').forEach(dayEl=>{
   dayEl.onmousedown=function(event){
     if(!advancedSelectionActive || event.button!==0) return;
     event.preventDefault();
     dragSelecting=true;
     selectDayElement(dayEl);
   };
   dayEl.onmouseenter=function(){
     if(advancedSelectionActive && dragSelecting){
       selectDayElement(dayEl);
     }
   };
 });
 if(!selectionMouseupBound){
   document.addEventListener('mouseup',()=>{dragSelecting=false;});
   selectionMouseupBound=true;
 }
}

function setupAdvancedControls(){
 const selectionMode=document.getElementById('selectionMode');
 const clearSelectedDays=document.getElementById('clearSelectedDays');
 const monthSelector=document.getElementById('monthSelector');

 if(selectionMode){
   selectionMode.onclick=function(){
     advancedSelectionActive=!advancedSelectionActive;
     selectionMode.classList.toggle('active',advancedSelectionActive);
     selectionMode.innerText=advancedSelectionActive ? 'Modo ativo' : 'Selecionar dias';
     attachDaySelectionEvents();
   };
 }

 if(clearSelectedDays){
   clearSelectedDays.onclick=function(){
     selectedDayKeys.clear();
     document.querySelectorAll('.selected-day').forEach(el=>el.classList.remove('selected-day'));
     updateAdvancedResults(db());
   };
 }

 if(monthSelector){
   monthSelector.querySelectorAll('input').forEach(input=>{
     input.onchange=function(){
       updateAdvancedResults(db());
     };
   });
 }

 updateAdvancedResults(db());
 attachDaySelectionEvents();
}

window.addEventListener('load', function () {
  setupAdvancedControls();
});


// ===== CORREÇÃO ISOLADA DO BOTÃO FECHAR =====
window.addEventListener('load', function () {
  const closeBtn = document.getElementById('close');
  const modalEl = document.getElementById('modal');

  if (closeBtn && modalEl) {
    closeBtn.onclick = function(event) {
      if(event){
        event.preventDefault();
        event.stopPropagation();
      }
      modalEl.classList.add('hidden');
      return false;
    };
  }
});
