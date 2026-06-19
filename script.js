
function loadJournalFields(v){
 const map=['economicCalendar','globalOverview','dailyStopLoss','profitGoal','maxTrades','assetDirection','entryReason','tradePlan','tradeResult','mistakesMade'];
 map.forEach(id=>{const el=document.getElementById(id); if(el) el.value=v[id]||'';});
}
function collectJournalFields(){
 const map=['economicCalendar','globalOverview','dailyStopLoss','profitGoal','maxTrades','assetDirection','entryReason','tradePlan','tradeResult','mistakesMade'];
 const out={}; map.forEach(id=>{const el=document.getElementById(id); out[id]=el?el.value:'';}); return out;
}

const m=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let month=new Date().getMonth(), selected='';
const db=()=>JSON.parse(localStorage.getItem('traderPro')||'{}');
const saveDb=d=>localStorage.setItem('traderPro',JSON.stringify(d));
let selectedDayKeys=new Set();
let advancedSelectionActive=false;
let dragSelecting=false;
let selectionMouseupBound=false;
let operationsChartMode='month';
let operationsVisualizationMode='bar';
let operationsRangeStart='';
let operationsRangeEnd='';
let equityChartMode='month';
let equityRangeStart='';
let equityRangeEnd='';
let calendarResultMode='money';

function totals(){
 let all=0, yearTotal=0, grossLoss=0, y=year.value;
 let d=db();
 Object.entries(d).forEach(([k,v])=>{
  all+=Number(v.result||0);
  grossLoss+=getGrossLossForDay(v);
  if(k.startsWith(y+'-')) yearTotal+=Number(v.result||0);
 });
 setSignedMoneyText(annualTotal,yearTotal);
 setSignedMoneyText(allTimeTotal,all);
 if(typeof grossLossTotal!=='undefined') grossLossTotal.innerText='R$ '+grossLoss.toFixed(2);
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
   c.innerHTML=`<div class=date>${day}</div><div class=value>${formatCalendarResult(v.result,d,y)}</div><div>${v.points?Number(v.points)+' pts':''}</div><div>${v.ops?Number(v.ops)+' ops':''}</div><div>${v.dayType==='holiday'?'Feriado':v.dayType==='notOperated'?'Dia não Operado':''}</div>`;
   c.onclick=()=>openModal(key,v);
   calendar.appendChild(c);
 }
 totals();
}

function updateHolidayMarketRow(){
  var row=document.getElementById('holidayMarketRow');
  if(!row) return;
  row.style.display=(dayType.value==='holiday')?'flex':'none';
}
function setHolidayMarket(val){
  document.querySelectorAll('.holidayMarketBtn').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.market===val);
  });
}
function getHolidayMarket(){
  var active=document.querySelector('.holidayMarketBtn.active');
  return active ? active.dataset.market : '';
}
(function(){
  var row=document.getElementById('holidayMarketRow');
  if(row){
    document.querySelectorAll('.holidayMarketBtn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        setHolidayMarket(btn.dataset.market);
      });
    });
  }
  dayType.addEventListener('change', updateHolidayMarketRow);
})();

function openModal(k,v){selected=k;modal.classList.remove('hidden');dateTitle.innerText=formatDateBR(k);result.value=v.result||'';points.value=v.points||'';ops.value=v.ops||'';dayType.value=v.dayType||'';updateOperationFields(v.operationResults||[]);loadJournalFields(v);updateHolidayMarketRow();setHolidayMarket(v.holidayMarket||'');}
save.onclick=()=>{let d=db();let operationResults=readOperationValues();let resultValue=operationResults.length>=2?sumOperationValues(operationResults):(+result.value||0);d[selected]={result:resultValue,points:+points.value||0,ops:+ops.value||0,dayType:dayType.value||'',holidayMarket:getHolidayMarket(),operationResults:operationResults,...collectJournalFields()};saveDb(d);modal.classList.add('hidden');render();}
clearDay.onclick=()=>{let d=db();delete d[selected];saveDb(d);result.value='';points.value='';ops.value='';dayType.value='';setHolidayMarket('');updateHolidayMarketRow();updateOperationFields([]);modal.classList.add('hidden');render();}
close.onclick=()=>modal.classList.add('hidden');
prev.onclick=()=>{month=(month+11)%12;render()}
next.onclick=()=>{month=(month+1)%12;render()}
year.onchange=render;
render();


function formatBRL(v){
 return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function formatPercent(v){
 return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
}

function getYearNetTotal(data,selectedYear){
 return Object.entries(data).reduce((total,[key,value])=>{
   if(!key.startsWith(selectedYear+'-')) return total;
   return total+Number(value.result||0);
 },0);
}

function formatCalendarResult(value,data,selectedYear){
 const numericValue=Number(value||0);
 if(!numericValue) return '';
 if(calendarResultMode==='percent'){
   const yearTotal=getYearNetTotal(data,selectedYear);
   const percent=yearTotal!==0 ? (numericValue/Math.abs(yearTotal))*100 : 0;
   return (percent>0?'+':'')+formatPercent(percent);
 }
 return formatBRL(numericValue);
}

function setSignedMoneyText(el,value){
 if(!el) return;
 const numericValue=Number(value||0);
 el.innerText=formatBRL(numericValue);
 el.classList.toggle('is-negative',numericValue<0);
 el.classList.toggle('is-positive',numericValue>=0);
}

function formatDateBR(key){
 const parts=String(key||'').split('-');
 if(parts.length!==3) return key;
 return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
}

function getDayResultForKey(data,key){
 return Number((data[key]||{}).result||0);
}

function sumOperationValues(values){
 return values.reduce((total,value)=>total+Number(value||0),0);
}

function readOperationValues(){
 return Array.from(document.querySelectorAll('.operationValue')).map(input=>Number(input.value||0));
}

function syncOperationTotal(){
 const values=readOperationValues();
 if(values.length>=2){
   result.value=sumOperationValues(values).toFixed(2);
 }
}

function updateOperationFields(savedValues=[]){
 const holder=document.getElementById('operationFields');
 if(!holder) return;
 const count=Math.max(savedValues.length,Math.max(0,Math.floor(Number(ops.value||0))));
 holder.innerHTML='';
 result.readOnly=count>=2;
 result.classList.toggle('calculatedResult',count>=2);
 if(count<2){
   return;
 }
 for(let i=0;i<count;i++){
   const label=document.createElement('label');
   label.className='operationField';
   label.innerHTML=`<span>Operação ${i+1}</span><input class="operationValue" type="number" step="0.01" placeholder="Resultado R$">`;
   const input=label.querySelector('input');
   input.value=savedValues[i]!==undefined ? savedValues[i] : '';
   input.oninput=syncOperationTotal;
   holder.appendChild(label);
 }
 syncOperationTotal();
}

function getOperationEntries(data,scope){
 const selectedYear=year.value;
 return Object.keys(data).sort().flatMap(key=>{
   if(!key.startsWith(selectedYear+'-')) return [];
   const dt=new Date(key+'T00:00:00');
   if(scope==='month' && dt.getMonth()!==month) return [];
   if(operationsRangeStart && key<operationsRangeStart) return [];
   if(operationsRangeEnd && key>operationsRangeEnd) return [];
   const dayData=data[key]||{};
   const hasOperationData = (Array.isArray(dayData.operationResults) && dayData.operationResults.length>0) || Number(dayData.ops||0)>0 || Number(dayData.result||0)!==0;
   if((dayData.dayType==='holiday' || dayData.dayType==='notOperated') && !hasOperationData) return [];
   const saved=Array.isArray(dayData.operationResults) ? dayData.operationResults : [];
   const fallback=(Number(dayData.ops||0)>0 || Number(dayData.result||0)!==0) ? [Number(dayData.result||0)] : [];
   const values=saved.length ? saved : fallback;
   return values.map((value,index)=>({
     key,
     value:Number(value||0),
     label:formatDateBR(key)
   }));
 });
}

function getFilteredDateKeys(data,scope,startDate,endDate){
 const selectedYear=year.value;
 return Object.keys(data).filter(key=>{
   if(!key.startsWith(selectedYear+'-')) return false;
   const dt=new Date(key+'T00:00:00');
   if(scope==='month' && dt.getMonth()!==month) return false;
   if(startDate && key<startDate) return false;
   if(endDate && key>endDate) return false;
   return true;
 }).sort();
}

function getGrossLossForDay(dayData){
 const saved=Array.isArray(dayData.operationResults) ? dayData.operationResults : [];
 if(saved.length){
   return saved.reduce((total,value)=>{
     const result=Number(value||0);
     return result<0 ? total+result : total;
   },0);
 }
 const result=Number(dayData.result||0);
 return result<0 ? result : 0;
}

function updateOperationsSummary(values){
 const netTotal=values.reduce((total,value)=>total+Number(value||0),0);
 const grossProfit=values.reduce((total,value)=>{
   const result=Number(value||0);
   return result>0 ? total+result : total;
 },0);
 const grossLoss=values.reduce((total,value)=>{
   const result=Number(value||0);
   return result<0 ? total+result : total;
 },0);
 const setMetric=(id,value,isMoney=true)=>{
   const el=document.getElementById(id);
   if(!el) return;
   el.innerText=isMoney ? formatBRL(value) : String(value);
   el.classList.toggle('metricNegative',Number(value)<0);
   el.classList.toggle('metricPositive',Number(value)>=0);
 };
 setMetric('operationsNetTotal',netTotal);
 setMetric('operationsResultTotal',netTotal);
 setMetric('operationsGrossProfit',grossProfit);
 setMetric('operationsGrossLoss',grossLoss);
 setMetric('operationsTotalCount',values.length,false);
}

function getEfficiencySlices(values){
 const total=values.length;
 const winners=values.filter(value=>Number(value)>0).length;
 const losers=values.filter(value=>Number(value)<0).length;
 const ties=values.filter(value=>Number(value)===0).length;
 return [
   {label:'Vencedoras',value:winners,color:'#22b86a'},
   {label:'Perdedoras',value:losers,color:'#ff454b'},
   {label:'Empatadas',value:ties,color:'#ffffff'}
 ].filter(slice=>slice.value>0 || total===0);
}

function getEfficiencyPercent(value,total){
 if(!total) return 0;
 return (Number(value||0)/total)*100;
}

function createEfficiencyLabelsPlugin(total){
 return {
   id:'efficiencyLabelsPlugin',
   afterDatasetsDraw(chart){
     const meta=chart.getDatasetMeta(0);
     if(!meta || !meta.data.length) return;
     const ctx=chart.ctx;
     ctx.save();
     ctx.font='700 13px Segoe UI, sans-serif';
     ctx.textBaseline='middle';
     meta.data.forEach((arc,index)=>{
       const raw=chart.data.datasets[0].data[index];
       if(!raw) return;
       const label=chart.data.labels[index];
       const percent=getEfficiencyPercent(raw,total);
       const text=`${label} (${formatPercent(percent)})`;
       const props=arc.getProps(['x','y','startAngle','endAngle','outerRadius'],true);
       const angle=(props.startAngle+props.endAngle)/2;
       const lineStartX=props.x+Math.cos(angle)*(props.outerRadius-4);
       const lineStartY=props.y+Math.sin(angle)*(props.outerRadius-4);
       const lineEndX=props.x+Math.cos(angle)*(props.outerRadius+26);
       const lineEndY=props.y+Math.sin(angle)*(props.outerRadius+26);
       const boxWidth=ctx.measureText(text).width+18;
       const boxHeight=23;
       const boxX=lineEndX+(Math.cos(angle)>=0?8:-boxWidth-8);
       const boxY=lineEndY-boxHeight/2;
       ctx.strokeStyle='rgba(255,255,255,.88)';
       ctx.lineWidth=1.4;
       ctx.beginPath();
       ctx.moveTo(lineStartX,lineStartY);
       ctx.lineTo(lineEndX,lineEndY);
       ctx.lineTo(Math.cos(angle)>=0?boxX:boxX+boxWidth,lineEndY);
       ctx.stroke();
       ctx.fillStyle='#fff8d8';
       ctx.strokeStyle='rgba(0,0,0,.42)';
       ctx.lineWidth=1;
       ctx.beginPath();
       ctx.roundRect(boxX,boxY,boxWidth,boxHeight,3);
       ctx.fill();
       ctx.stroke();
       ctx.fillStyle='#202020';
       ctx.fillText(text,boxX+9,boxY+boxHeight/2);
     });
     ctx.restore();
   }
 };
}

const _oldTotals = totals;
totals = function(){
 let all=0, yearTotal=0, grossLoss=0, y=year.value;
 let d=db();
 Object.entries(d).forEach(([k,v])=>{
  all+=Number(v.result||0);
  grossLoss+=getGrossLossForDay(v);
  if(k.startsWith(y+'-')) yearTotal+=Number(v.result||0);
 });
 setSignedMoneyText(annualTotal,yearTotal);
 setSignedMoneyText(allTimeTotal,all);
 if(typeof grossLossTotal!=='undefined') grossLossTotal.innerText=formatBRL(grossLoss);
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
   c.innerHTML=`<div class=date>${day}</div><div class=value>${formatCalendarResult(v.result,d,y)}</div><div>${v.points?Number(v.points)+' pts':''}</div><div>${v.ops?Number(v.ops)+' ops':''}</div><div>${v.dayType==='holiday'?'Feriado':v.dayType==='notOperated'?'Dia não Operado':''}</div>`;
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
      let flagsHtml='';
      if(v.dayType==='holiday' && v.holidayMarket){
        if(v.holidayMarket==='BRL') flagsHtml='<div class="dayFlags"><img src="BRASIL.png" class="dayFlag" alt="BRL"></div>';
        else if(v.holidayMarket==='EUA') flagsHtml='<div class="dayFlags"><img src="EUA.png" class="dayFlag" alt="EUA"></div>';
        else if(v.holidayMarket==='BRL/EUA') flagsHtml='<div class="dayFlags"><img src="BRASIL.png" class="dayFlag" alt="BRL"><img src="EUA.png" class="dayFlag" alt="EUA"></div>';
      }
      c.innerHTML=`${flagsHtml}<div class=date>${day}</div>
      <div class=value>${formatCalendarResult(v.result,data,y)}</div>
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
let grossLossSparklineInstance=null;

function drawCharts(){
 if(typeof Chart==='undefined') return;
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
      data:{labels:m,datasets:[{label:'Operações',data:monthly}]},
      options:{responsive:true}
   });
 }
}

render();


// ===== MELHORIAS VISUAIS AUTOMÁTICAS =====
function drawCharts(){
 if(typeof Chart==='undefined'){
   const data=db();
   const operationEntries=getOperationEntries(data,operationsChartMode);
   const operationsChartFrame=document.querySelector('.operationsChartFrame');
   if(operationsChartFrame) operationsChartFrame.classList.toggle('pieMode',operationsVisualizationMode==='pie');
   updateOperationsSummary(operationEntries.map(entry=>entry.value));
   return;
 }
 const data=db();
 const selectedYear=year.value;
 const keys=getFilteredDateKeys(data,equityChartMode,equityRangeStart,equityRangeEnd);
 const allKeys=Object.keys(data).sort();

 let acc=0, labels=[], equity=[];
 keys.forEach(k=>{
   acc+=Number(data[k].result||0);
   labels.push(formatDateBR(k));
   equity.push(acc);
 });

 const isPositiveCurve=(equity.length===0 || equity[equity.length-1] >= 0);
 const externalEquityTooltip=context=>{
   const {chart,tooltip}=context;
   let tooltipEl=document.getElementById('equityTooltip');
   if(!tooltipEl){
     tooltipEl=document.createElement('div');
     tooltipEl.id='equityTooltip';
     tooltipEl.className='equityTooltip';
     document.body.appendChild(tooltipEl);
   }
   if(tooltip.opacity===0){
     tooltipEl.style.opacity=0;
     return;
   }
   const point=tooltip.dataPoints && tooltip.dataPoints[0];
   if(!point) return;
   const key=keys[point.dataIndex];
   const daily=getDayResultForKey(data,key);
   const patrimony=point.parsed.y;
   const positive=patrimony>=0;
   tooltipEl.classList.toggle('negative',!positive);
   tooltipEl.innerHTML=`
     <div class="equityTooltipDate">${formatDateBR(key)}</div>
     <div class="equityTooltipLabel">Patrimônio</div>
     <div class="equityTooltipValue">${formatBRL(patrimony)}</div>
     <div class="equityTooltipResult">${daily>=0?'+':''}${formatBRL(daily)}</div>
   `;
   const rect=chart.canvas.getBoundingClientRect();
   tooltipEl.style.opacity=1;
   tooltipEl.style.left=rect.left+window.pageXOffset+tooltip.caretX+'px';
   tooltipEl.style.top=rect.top+window.pageYOffset+tooltip.caretY+'px';
 };
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
     if(!area) return isPositiveCurve ? 'rgba(32,247,164,.24)' : 'rgba(255,93,115,.24)';
     const g=chart.ctx.createLinearGradient(0,area.top,0,area.bottom);
     if(isPositiveCurve){
       g.addColorStop(0,'rgba(32,247,164,.5)');
       g.addColorStop(.5,'rgba(32,247,164,.2)');
       g.addColorStop(1,'rgba(0,0,0,.14)');
     }else{
       g.addColorStop(0,'rgba(255,93,115,.5)');
       g.addColorStop(.5,'rgba(255,93,115,.2)');
       g.addColorStop(1,'rgba(0,0,0,.14)');
     }
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
          pointHoverRadius:7,
          pointHoverBackgroundColor:isPositiveCurve ? '#20f7a4' : '#ff5d73',
          pointHoverBorderColor:'#ffffff',
          pointHoverBorderWidth:3,
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
            enabled:false,
            external:externalEquityTooltip
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

 const operationEntries=getOperationEntries(data,operationsChartMode);
 const operationLabels=operationEntries.map(entry=>entry.label);
 const operationValues=operationEntries.map(entry=>entry.value);
 updateOperationsSummary(operationValues);
 const operationColors=operationValues.map(v=>v>0 ? '#22b86a' : v<0 ? '#ff454b' : 'rgba(255,255,255,0)');
 const operationBorderColors=operationValues.map(v=>v>0 ? '#0d0f0f' : v<0 ? '#0d0f0f' : '#ffffff');
 const zeroOperationPlugin={
   id:'zeroOperationPlugin',
   afterDatasetsDraw(chart){
     const meta=chart.getDatasetMeta(0);
     const yScale=chart.scales.y;
     if(!meta || !yScale) return;
     const zeroY=yScale.getPixelForValue(0);
     const ctx=chart.ctx;
     ctx.save();
     ctx.strokeStyle='#ffffff';
     ctx.lineWidth=3;
     meta.data.forEach((bar,index)=>{
       if(Number(operationValues[index]||0)!==0) return;
       const x=bar.x;
       const width=Math.max(12,(bar.width||22)*.72);
       ctx.beginPath();
       ctx.moveTo(x-width/2,zeroY);
       ctx.lineTo(x+width/2,zeroY);
       ctx.stroke();
     });
     ctx.restore();
   }
 };
 const operationsBackgroundPlugin={
   id:'operationsBackgroundPlugin',
   beforeDraw(chart){
     const ctx=chart.ctx;
     const area=chart.chartArea;
     if(!area) return;
     ctx.save();
     ctx.fillStyle='#202020';
     ctx.fillRect(area.left,area.top,area.right-area.left,area.bottom-area.top);
     ctx.restore();
   }
 };

 const operationsChartFrame=document.querySelector('.operationsChartFrame');
 if(operationsChartFrame) operationsChartFrame.classList.toggle('pieMode',operationsVisualizationMode==='pie');
 const mctx=document.getElementById('monthlyChart');
 if(mctx){
   if(monthlyChartInstance) monthlyChartInstance.destroy();
   if(operationsVisualizationMode==='pie'){
     const efficiencySlices=getEfficiencySlices(operationValues);
     const totalOperations=operationValues.length;
     const pieLabels=totalOperations ? efficiencySlices.map(slice=>slice.label) : ['Sem operações'];
     const pieValues=totalOperations ? efficiencySlices.map(slice=>slice.value) : [1];
     const pieColors=totalOperations ? efficiencySlices.map(slice=>slice.color) : ['#ffffff'];
     monthlyChartInstance=new Chart(mctx,{
       type:'pie',
       data:{
         labels:pieLabels,
         datasets:[{
           data:pieValues,
           backgroundColor:pieColors,
           borderColor:'#161616',
           borderWidth:3,
           hoverOffset:5
         }]
       },
       options:{
         responsive:true,
         maintainAspectRatio:false,
         layout:{padding:{top:46,right:120,bottom:34,left:120}},
         plugins:{
           legend:{display:false},
           title:{display:true,text:'Eficiência',color:'#ffffff',font:{size:20,weight:'800'}},
           tooltip:{
             backgroundColor:'rgba(8,8,8,.94)',
             borderColor:'rgba(255,255,255,.2)',
             borderWidth:1,
             callbacks:{
               label:ctx=>{
                 if(!totalOperations) return 'Sem operações';
                 return `${ctx.label}: ${ctx.parsed} (${formatPercent(getEfficiencyPercent(ctx.parsed,totalOperations))})`;
               }
             }
           }
         }
       },
       plugins:[operationsBackgroundPlugin,createEfficiencyLabelsPlugin(totalOperations)]
     });
   }else{
     monthlyChartInstance=new Chart(mctx,{
      type:'bar',
      data:{
        labels:operationLabels,
        datasets:[{
          label:'Operações',
          data:operationValues,
          backgroundColor:operationColors,
          borderColor:operationBorderColors,
          borderWidth:2,
          borderSkipped:false,
          barPercentage:.72,
          categoryPercentage:.82
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        layout:{padding:{top:38}},
        plugins:{
          legend:{display:false},
          title:{display:true,text:'Operações',color:'#ffffff',font:{size:16,weight:'700',family:'Georgia, serif'}},
          tooltip:{
            backgroundColor:'rgba(8,8,8,.94)',
            borderColor:'rgba(255,255,255,.2)',
            borderWidth:1,
            callbacks:{
              label:ctx=>'Resultado: '+formatBRL(ctx.parsed.y)
            }
          }
        },
        scales:{
          x:{
            ticks:{color:'#ffffff',maxRotation:0,minRotation:0,font:{size:11}},
            grid:{display:false},
            border:{color:'#242424'}
          },
          y:{
            position:'right',
            ticks:{color:'#ffffff',callback:value=>Number(value).toLocaleString('pt-BR')},
            title:{display:true,text:'Saldo (R$)',color:'#ffffff'},
            grid:{color:'rgba(255,255,255,.08)',lineWidth:1},
            border:{display:false}
          }
        }
      },
      plugins:[operationsBackgroundPlugin,zeroOperationPlugin]
     });
   }
 }

 drawSummaryCards(data,allKeys);
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

function buildGrossLossSeries(entries,data){
 let acc=0;
 let series=[0];
 entries.forEach(k=>{
   const loss=getGrossLossForDay(data[k]||{});
   if(loss<0){
     acc+=loss;
     series.push(acc);
   }
 });
 if(series.length===1) series.push(0);
 return series;
}

function drawSparkline(canvasId,values,total,previousInstance,forceNegative=false){
 const canvas=document.getElementById(canvasId);
 if(!canvas) return previousInstance;
 if(previousInstance) previousInstance.destroy();
 const positive=!forceNegative && Number(total||0)>=0;
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
 const grossLossSeries=buildGrossLossSeries(keys,data);
 const yearTotal=yearSeries[yearSeries.length-1]||0;
 const allTotal=allSeries[allSeries.length-1]||0;
 const grossLossTotalValue=grossLossSeries[grossLossSeries.length-1]||0;
 annualSparklineInstance=drawSparkline('annualSparkline',yearSeries,yearTotal,annualSparklineInstance);
 allTimeSparklineInstance=drawSparkline('allTimeSparkline',allSeries,allTotal,allTimeSparklineInstance);
 grossLossSparklineInstance=drawSparkline('grossLossSparkline',grossLossSeries,grossLossTotalValue,grossLossSparklineInstance,true);
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

function setupOperationControls(){
 const monthButton=document.getElementById('operationsMonthView');
 const yearButton=document.getElementById('operationsYearView');
 const barButton=document.getElementById('operationsBarView');
 const pieButton=document.getElementById('operationsPieView');
 const startInput=document.getElementById('operationsStartDate');
 const endInput=document.getElementById('operationsEndDate');
 const setMode=mode=>{
   operationsChartMode=mode;
   if(monthButton) monthButton.classList.toggle('active',mode==='month');
   if(yearButton) yearButton.classList.toggle('active',mode==='year');
   drawCharts();
 };
 const setRange=()=>{
   operationsRangeStart=startInput ? startInput.value : '';
   operationsRangeEnd=endInput ? endInput.value : '';
   drawCharts();
 };
 const setVisualization=mode=>{
   operationsVisualizationMode=mode;
   if(barButton) barButton.classList.toggle('active',mode==='bar');
   if(pieButton) pieButton.classList.toggle('active',mode==='pie');
   drawCharts();
 };
 if(monthButton) monthButton.onclick=()=>setMode('month');
 if(yearButton) yearButton.onclick=()=>setMode('year');
 if(barButton) barButton.onclick=()=>setVisualization('bar');
 if(pieButton) pieButton.onclick=()=>setVisualization('pie');
 if(startInput) startInput.onchange=setRange;
 if(endInput) endInput.onchange=setRange;
 if(ops){
   ops.oninput=function(){
     updateOperationFields(readOperationValues());
   };
 }
}

function setupEquityControls(){
 const monthButton=document.getElementById('equityMonthView');
 const yearButton=document.getElementById('equityYearView');
 const startInput=document.getElementById('equityStartDate');
 const endInput=document.getElementById('equityEndDate');
 const setMode=mode=>{
   equityChartMode=mode;
   if(monthButton) monthButton.classList.toggle('active',mode==='month');
   if(yearButton) yearButton.classList.toggle('active',mode==='year');
   drawCharts();
 };
 const setRange=()=>{
   equityRangeStart=startInput ? startInput.value : '';
   equityRangeEnd=endInput ? endInput.value : '';
   drawCharts();
 };
 if(monthButton) monthButton.onclick=()=>setMode('month');
 if(yearButton) yearButton.onclick=()=>setMode('year');
 if(startInput) startInput.onchange=setRange;
 if(endInput) endInput.onchange=setRange;
}

function setupAdvancedControls(){
 const selectionMode=document.getElementById('selectionMode');
 const calendarMoneyView=document.getElementById('calendarMoneyView');
 const calendarPercentView=document.getElementById('calendarPercentView');
 const clearSelectedDays=document.getElementById('clearSelectedDays');
 const monthSelector=document.getElementById('monthSelector');

 const setCalendarMode=mode=>{
   calendarResultMode=mode;
   if(calendarMoneyView) calendarMoneyView.classList.toggle('active',mode==='money');
   if(calendarPercentView) calendarPercentView.classList.toggle('active',mode==='percent');
   render();
 };

 if(calendarMoneyView) calendarMoneyView.onclick=()=>setCalendarMode('money');
 if(calendarPercentView) calendarPercentView.onclick=()=>setCalendarMode('percent');

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
  setupOperationControls();
  setupEquityControls();
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


document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.journalToggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      toggle.parentElement.classList.toggle('open');
    });
  });
});


// ===== AGENDA DO TRADER — CONTROLE DE ABAS =====
(function(){
  var subtitleMap={
    '1':'Planejamento e diário do dia',
    '2':'Plano do dia',
    '3':'Registro de Operações'
  };

  function activateTab(tabNum){
    document.querySelectorAll('.agendaTab').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.tab===tabNum);
    });
    document.querySelectorAll('.agendaPanel').forEach(function(panel){
      panel.classList.toggle('active', panel.dataset.panel===tabNum);
    });
    var sub=document.getElementById('agendaSubtitle');
    if(sub) sub.textContent=subtitleMap[tabNum]||'Planejamento e diário do dia';
  }

  function setupAgendaTabs(){
    document.querySelectorAll('.agendaTab').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        activateTab(btn.dataset.tab);
      });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', setupAgendaTabs);
  } else {
    setupAgendaTabs();
  }

  // Re-init whenever modal opens (render() may replace DOM)
  var _origOpenModal=typeof openModal==='function' ? openModal : null;
  if(_origOpenModal){
    openModal=function(k,v){
      _origOpenModal(k,v);
      setupAgendaTabs();
      activateTab('1');
    };
  }
})();

// Reset agenda para aba 1 sempre que o modal abrir
(function(){
  var mo=document.getElementById('modal');
  if(!mo) return;
  var obs=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if(m.attributeName==='class'){
        var hidden=mo.classList.contains('hidden');
        if(!hidden){
          // modal abriu: ativa aba 1
          document.querySelectorAll('.agendaTab').forEach(function(b){ b.classList.toggle('active',b.dataset.tab==='1'); });
          document.querySelectorAll('.agendaPanel').forEach(function(p){ p.classList.toggle('active',p.dataset.panel==='1'); });
          var sub=document.getElementById('agendaSubtitle');
          if(sub) sub.textContent='Planejamento e diário do dia';
        }
      }
    });
  });
  obs.observe(mo,{attributes:true});
})();


// ===== IMPORTAR / EXPORTAR DADOS =====
(function(){
  function showToast(msg, type){
    var toast=document.getElementById('ieToast');
    if(!toast) return;
    toast.textContent=msg;
    toast.className='ieToast '+type;
    setTimeout(function(){ toast.className='ieToast hidden'; }, 3500);
  }

  function getDateStamp(){
    var d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  // EXPORTAR
  var exportBtn=document.getElementById('exportBtn');
  if(exportBtn){
    exportBtn.addEventListener('click', function(){
      var data=localStorage.getItem('traderPro');
      if(!data || data==='{}'){
        showToast('⚠ Nenhum dado encontrado para exportar.','error');
        return;
      }
      var blob=new Blob([data],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.download='trader-pro-backup-'+getDateStamp()+'.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Dados exportados com sucesso!','success');
    });
  }

  // IMPORTAR
  var importBtn=document.getElementById('importBtn');
  var importFileInput=document.getElementById('importFileInput');

  if(importBtn && importFileInput){
    importBtn.addEventListener('click', function(){
      importFileInput.value='';
      importFileInput.click();
    });

    importFileInput.addEventListener('change', function(){
      var file=importFileInput.files[0];
      if(!file) return;
      var reader=new FileReader();
      reader.onload=function(e){
        try{
          var parsed=JSON.parse(e.target.result);
          if(typeof parsed!=='object' || Array.isArray(parsed)){
            showToast('❌ Arquivo inválido. Selecione um backup exportado pelo dashboard.','error');
            return;
          }
          localStorage.setItem('traderPro', JSON.stringify(parsed));
          showToast('✅ Dados importados com sucesso! Recarregando...','success');
          setTimeout(function(){ location.reload(); }, 1800);
        } catch(err){
          showToast('❌ Erro ao ler o arquivo. Verifique se é um JSON válido.','error');
        }
      };
      reader.readAsText(file);
    });
  }
})();


// ===== CORREÇÃO: campo ops controla quantidade exata de abas de operação =====
(function(){
  function waitForOps(){
    var opsEl=document.getElementById('ops');
    if(!opsEl){ setTimeout(waitForOps, 200); return; }

    opsEl.addEventListener('input', function(){
      var count=Math.max(0, Math.floor(Number(opsEl.value||0)));
      var holder=document.getElementById('operationFields');
      var resultEl=document.getElementById('result');
      if(!holder) return;

      // Captura valores existentes antes de recriar
      var currentValues=Array.from(holder.querySelectorAll('.operationValue'))
        .map(function(inp){ return inp.value; });

      holder.innerHTML='';

      if(count<2){
        if(resultEl){ resultEl.readOnly=false; resultEl.classList.remove('calculatedResult'); }
        return;
      }

      if(resultEl){ resultEl.readOnly=true; resultEl.classList.add('calculatedResult'); }

      for(var i=0; i<count; i++){
        var label=document.createElement('label');
        label.className='operationField';
        label.innerHTML='<span>Operação '+(i+1)+'</span><input class="operationValue" type="number" step="0.01" placeholder="Resultado R$">';
        var inp=label.querySelector('input');
        // Preserva valor se já existia, descarta se a aba foi removida
        inp.value = (currentValues[i] !== undefined) ? currentValues[i] : '';
        inp.addEventListener('input', function(){
          var vals=Array.from(holder.querySelectorAll('.operationValue'))
            .map(function(x){ return Number(x.value||0); });
          if(resultEl && vals.length>=2){
            resultEl.value=vals.reduce(function(a,b){return a+b;},0).toFixed(2);
          }
        });
        holder.appendChild(label);
      }

      // Atualiza total imediatamente
      var vals=Array.from(holder.querySelectorAll('.operationValue'))
        .map(function(x){ return Number(x.value||0); });
      if(resultEl && vals.length>=2){
        resultEl.value=vals.reduce(function(a,b){return a+b;},0).toFixed(2);
      }
    }, true); // captura na fase de capture para sobrepor o handler original
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', waitForOps);
  } else {
    waitForOps();
  }
})();

// ===== MODAL: SCROLL LOCK SEM PULAR TELA =====
(function(){
 var modalEl=document.getElementById('modal');
 if(!modalEl) return;
 var scrollY=0;
 function lock(){
  scrollY=window.scrollY||window.pageYOffset||0;
  document.body.style.top='-'+scrollY+'px';
  document.body.classList.add('modal-open');
 }
 function unlock(){
  document.body.classList.remove('modal-open');
  document.body.style.top='';
  window.scrollTo(0,scrollY);
 }
 new MutationObserver(function(muts){
  muts.forEach(function(m){
   if(m.attributeName==='class'){
    modalEl.classList.contains('hidden') ? unlock() : lock();
   }
  });
 }).observe(modalEl,{attributes:true});
})();


// ===== CALENDÁRIO ECONÔMICO — ESCALA RESPONSIVA =====
(function(){
  var IFRAME_W = 650;  // largura interna fixa do widget Investing.com
  var IFRAME_H = 500;  // altura base do iframe

  var frame    = document.querySelector('.econCalFrame');
  var wrap     = document.querySelector('.econCalScaleWrap');
  var iframe   = document.getElementById('econCalIframe');
  if(!frame || !wrap || !iframe) return;

  function scaleCalendar(){
    var availW = frame.clientWidth;
    if(availW <= 0) return;
    var scale = availW >= IFRAME_W ? 1 : availW / IFRAME_W;
    wrap.style.transform = 'scale(' + scale + ')';
    // Ajusta a altura do container para não deixar espaço vazio
    frame.style.height = Math.ceil(IFRAME_H * scale) + 'px';
  }

  // Executa ao carregar e ao redimensionar
  window.addEventListener('resize', scaleCalendar);
  // Aguarda DOM + fontes antes do primeiro cálculo
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', scaleCalendar);
  } else {
    scaleCalendar();
  }
  // Segurança: roda novamente após um tick para pegar dimensões corretas
  setTimeout(scaleCalendar, 100);
  setTimeout(scaleCalendar, 600);
})();

// ===== AGENDA DO TRADER — AUTO-SAVE EM TEMPO REAL =====
(function(){
  var journalFields=[
    'economicCalendar','globalOverview',          // aba 1
    'dailyStopLoss','profitGoal','maxTrades',      // aba 2
    'assetDirection','entryReason','tradePlan','tradeResult','mistakesMade' // aba 3
  ];

  // Persiste os campos da agenda no localStorage imediatamente ao digitar
  function autoSaveJournal(){
    if(!selected) return; // modal não está aberto ainda
    var d=db();
    // Garante que o registro do dia existe antes de salvar a agenda
    if(!d[selected]) d[selected]={};
    journalFields.forEach(function(id){
      var el=document.getElementById(id);
      if(el) d[selected][id]=el.value;
    });
    saveDb(d);
  }

  // Salva também quando o modal fecha (captura o que ainda não foi persistido)
  function autoSaveOnClose(){
    if(!selected) return;
    var d=db();
    if(!d[selected]) d[selected]={};
    journalFields.forEach(function(id){
      var el=document.getElementById(id);
      if(el) d[selected][id]=el.value;
    });
    saveDb(d);
  }

  // Aguarda DOM estar pronto para anexar listeners
  function setupAutoSave(){
    journalFields.forEach(function(id){
      var el=document.getElementById(id);
      if(!el) return;
      // 'input' dispara em cada tecla; 'change' pega colar/autofill
      el.addEventListener('input', autoSaveJournal);
      el.addEventListener('change', autoSaveJournal);
    });

    // Salva ao fechar o modal pelos botões fechar/salvar/limpar
    var closeBtn=document.getElementById('close');
    var saveBtn=document.getElementById('save');
    var clearBtn=document.getElementById('clearDay');
    if(closeBtn) closeBtn.addEventListener('click', autoSaveOnClose);
    if(saveBtn)  saveBtn.addEventListener('click',  autoSaveOnClose);
    if(clearBtn) clearBtn.addEventListener('click',  function(){
      // clearDay apaga o dia inteiro — não precisamos salvar a agenda
    });

    // Salva também ao clicar fora do modal (overlay)
    var modalEl=document.getElementById('modal');
    if(modalEl){
      modalEl.addEventListener('click', function(e){
        if(e.target===modalEl) autoSaveOnClose();
      });
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', setupAutoSave);
  } else {
    setupAutoSave();
  }
})();
