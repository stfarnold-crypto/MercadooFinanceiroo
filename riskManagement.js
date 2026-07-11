/* ===== MÓDULO: GERENCIAMENTO DE RISCO PROFISSIONAL (WDO) ===== */
(function(){

  var STORAGE_KEY='wdoRiskManagement';
  var POINT_VALUE=10;          // R$ por ponto, por contrato
  var RISK_TRADE_PCT=0.01;     // risco máximo por operação: 1%
  var RISK_DAILY_PCT=0.02;     // perda máxima diária: 2%
  var DRAWDOWN_PCT=0.10;       // drawdown máximo: 10%
  var TARGETS=[10,20,30,40];   // alvos em pontos

  function formatBRL(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }

  function formatPercent(v){
    return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  }

  // Converte a string digitada (ex: "R$ 3.000,00") no valor numérico em reais (ex: 3000)
  function parseCurrencyDigits(str){
    var digits=(str||'').replace(/\D/g,'');
    return digits?parseInt(digits,10)/100:0;
  }

  // Aplica a máscara R$ no input enquanto o usuário digita, mantendo o valor numérico em dataset.value
  function maskCurrencyInput(input){
    var num=parseCurrencyDigits(input.value);
    input.value=formatBRL(num);
    input.dataset.value=num;
  }

  function getEls(){
    return {
      capitalInput: document.getElementById('rmCapital'),
      stopInput: document.getElementById('rmStopPoints'),
      metaInput: document.getElementById('rmMetaMensal'),
      outCapital: document.getElementById('rmOutCapital'),
      outContracts: document.getElementById('rmOutContracts'),
      outRiskValue: document.getElementById('rmOutRiskValue'),
      outRiskPercent: document.getElementById('rmOutRiskPercent'),
      outDailyLoss: document.getElementById('rmOutDailyLoss'),
      outDrawdown: document.getElementById('rmOutDrawdown'),
      outMaxStops: document.getElementById('rmOutMaxStops'),
      planMaxStops: document.getElementById('rmPlanMaxStops'),
      outMeta: document.getElementById('rmOutMeta'),
      targetsTable: document.getElementById('rmTargetsTable')
    };
  }

  function loadState(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return {capital:3000,stopPoints:2,meta:3000};
  }

  function saveState(state){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }catch(e){}
  }

  function calculate(state){
    var capital=Number(state.capital)||0;
    var stopPoints=Number(state.stopPoints)||0;
    var meta=Number(state.meta)||0;

    var stopValue=stopPoints*POINT_VALUE;
    var maxRisk=capital*RISK_TRADE_PCT;
    var contracts=stopValue>0?Math.floor(maxRisk/stopValue):0;
    var riskValue=contracts*stopValue;
    var riskPercent=capital>0?(riskValue/capital)*100:0;
    var dailyLossMax=capital*RISK_DAILY_PCT;
    var drawdownMax=capital*DRAWDOWN_PCT;

    // Stops Permitidos = piso( (Capital x Risco Diário %) / (Stop(pontos) x Valor do Ponto x Contratos) )
    var maxStops=riskValue>0?Math.floor(dailyLossMax/riskValue):0;

    var targets=TARGETS.map(function(points){
      var result=points*POINT_VALUE*contracts;
      var opsNeeded=result>0?Math.ceil(meta/result):null;
      return {points:points,result:result,opsNeeded:opsNeeded};
    });

    return {
      capital:capital,
      contracts:contracts,
      riskValue:riskValue,
      riskPercent:riskPercent,
      dailyLossMax:dailyLossMax,
      drawdownMax:drawdownMax,
      maxStops:maxStops,
      meta:meta,
      targets:targets
    };
  }

  function renderTargetsTable(container,targets){
    var html='<div class="riskMgmtTargetsRow riskMgmtTargetsHeaderRow">'+
      '<span>Alvo</span><span>Resultado / Op.</span><span>Ops. p/ Meta</span></div>';
    targets.forEach(function(t){
      var opsLabel=t.opsNeeded===null?'—':t.opsNeeded+' op.';
      html+='<div class="riskMgmtTargetsRow">'+
        '<span>'+t.points+' pts</span>'+
        '<span>'+formatBRL(t.result)+'</span>'+
        '<span>'+opsLabel+'</span></div>';
    });
    container.innerHTML=html;
  }

  function render(){
    var e=getEls();
    if(!e.capitalInput) return;

    var state={
      capital:e.capitalInput.dataset.value||parseCurrencyDigits(e.capitalInput.value),
      stopPoints:e.stopInput.value,
      meta:e.metaInput.dataset.value||parseCurrencyDigits(e.metaInput.value)
    };
    saveState(state);

    var r=calculate(state);

    e.outCapital.textContent=formatBRL(r.capital);
    e.outContracts.textContent=r.contracts;
    e.outRiskValue.textContent=formatBRL(r.riskValue);
    e.outRiskPercent.textContent=formatPercent(r.riskPercent);
    e.outDailyLoss.textContent=formatBRL(r.dailyLossMax);
    e.outDrawdown.textContent=formatBRL(r.drawdownMax);
    e.outMaxStops.textContent=r.maxStops;
    e.outMeta.textContent=formatBRL(r.meta);
    e.planMaxStops.textContent='✅ Após '+r.maxStops+(r.maxStops===1?' stop consecutivo':' stops consecutivos')+' encerrar imediatamente o pregão.';

    renderTargetsTable(e.targetsTable,r.targets);
  }

  function init(){
    var e=getEls();
    if(!e.capitalInput) return;

    var state=loadState();
    e.capitalInput.value=formatBRL(state.capital);
    e.capitalInput.dataset.value=state.capital;
    e.stopInput.value=state.stopPoints;
    e.metaInput.value=formatBRL(state.meta);
    e.metaInput.dataset.value=state.meta;

    [e.capitalInput,e.metaInput].forEach(function(input){
      input.addEventListener('input',function(){
        maskCurrencyInput(input);
        render();
      });
    });
    e.stopInput.addEventListener('input',render);

    render();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }

})();
