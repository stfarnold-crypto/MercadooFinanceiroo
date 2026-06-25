/* ===================================================================
   INSIGHTS.JS — Análise inteligente do Diário de Trading via IA
   v2.0 — Integração completa com dados da aba Operações:
     · Resultado Liq. Tot. / Resultado Total
     · Lucro Bruto / Prejuízo Bruto
     · Total de Operações
     · Gráfico de pizza: Vencedoras / Perdedoras / Empatadas
   Arquivo separado: não modifica script.js original
   =================================================================== */

(function () {
  'use strict';

  /* ---- Helpers de formatação (independentes do script.js) ---- */
  function fmtBRL(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function fmtPct(v) {
    return (Number(v || 0) >= 0 ? '+' : '') + Number(v || 0).toFixed(1) + '%';
  }
  function getDb() {
    try { return JSON.parse(localStorage.getItem('traderPro') || '{}'); } catch (e) { return {}; }
  }

  /* ---- Nomes dos meses (espelho do script.js para não depender dele) ---- */
  var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /* ---- Lê o mês/ano atualmente exibido no dashboard ---- */
  function getCurrentMonthYear() {
    var yearEl  = document.getElementById('year');
    var monthEl = document.getElementById('monthLabel');
    var y = yearEl ? parseInt(yearEl.value) : new Date().getFullYear();
    var label = monthEl ? monthEl.innerText : '';
    var mIdx = MONTHS.findIndex(function (name) { return label.startsWith(name); });
    if (mIdx === -1) mIdx = new Date().getMonth();
    return { year: y, monthIndex: mIdx, monthName: MONTHS[mIdx] };
  }

  /* ---- Coleta dados do mês atual do localStorage ---- */
  function collectMonthData(year, monthIndex) {
    var data = getDb();
    var prefix = year + '-' + String(monthIndex + 1).padStart(2, '0') + '-';
    var days = [];
    Object.keys(data).sort().forEach(function (key) {
      if (!key.startsWith(prefix)) return;
      var v = data[key];
      days.push({
        key: key,
        date: key.split('-').reverse().join('/'),
        result:            Number(v.result || 0),
        points:            Number(v.points || 0),
        ops:               Number(v.ops || 0),
        dayType:           v.dayType || '',
        /* Diário de Trading */
        economicCalendar:  (v.economicCalendar  || '').trim(),
        globalOverview:    (v.globalOverview     || '').trim(),
        dailyStopLoss:     (v.dailyStopLoss      || '').trim(),
        profitGoal:        (v.profitGoal         || '').trim(),
        maxTrades:         (v.maxTrades          || '').trim(),
        assetDirection:    (v.assetDirection     || '').trim(),
        entryReason:       (v.entryReason        || '').trim(),
        tradePlan:         (v.tradePlan          || '').trim(),
        tradeResult:       (v.tradeResult        || '').trim(),
        mistakesMade:      (v.mistakesMade       || '').trim(),
        operationResults:  Array.isArray(v.operationResults) ? v.operationResults : []
      });
    });
    return days;
  }

  /* ===================================================================
     NOVA FUNÇÃO: espelha exatamente a lógica de getOperationEntries()
     do script.js para obter os valores individuais de cada operação,
     que são os mesmos dados usados pelo gráfico de pizza e pelo painel
     de métricas da aba Operações.
     =================================================================== */
  function getOperationValues(days) {
    var values = [];
    days.forEach(function (d) {
      if (d.dayType === 'holiday' || d.dayType === 'notOperated') {
        // Inclui apenas se tiver dados registrados (mesma regra do script.js)
        var hasData = (d.operationResults && d.operationResults.length > 0) ||
                      d.ops > 0 || d.result !== 0;
        if (!hasData) return;
      }
      var saved = Array.isArray(d.operationResults) ? d.operationResults : [];
      if (saved.length > 0) {
        // Usa cada operação individual registrada
        saved.forEach(function (v) { values.push(Number(v || 0)); });
      } else if (d.ops > 0 || d.result !== 0) {
        // Fallback: trata o resultado do dia como uma única operação
        values.push(Number(d.result || 0));
      }
    });
    return values;
  }

  /* ===================================================================
     NOVA FUNÇÃO: calcula as métricas da aba Operações
     Espelha updateOperationsSummary() + getEfficiencySlices() do script.js
     =================================================================== */
  function calcOperationsMetrics(opValues) {
    var total    = opValues.length;
    var netTotal = opValues.reduce(function (a, v) { return a + Number(v || 0); }, 0);

    var grossProfit = opValues.reduce(function (a, v) {
      var r = Number(v || 0); return r > 0 ? a + r : a;
    }, 0);
    var grossLoss = opValues.reduce(function (a, v) {
      var r = Number(v || 0); return r < 0 ? a + r : a;
    }, 0);

    // Eficiência — mesma lógica de getEfficiencySlices()
    var winners = opValues.filter(function (v) { return Number(v) > 0; }).length;
    var losers  = opValues.filter(function (v) { return Number(v) < 0; }).length;
    var ties    = opValues.filter(function (v) { return Number(v) === 0; }).length;

    var winRateOps  = total ? (winners / total) * 100 : 0;
    var lossRateOps = total ? (losers  / total) * 100 : 0;
    var tieRateOps  = total ? (ties    / total) * 100 : 0;

    // Ganho/perda médio por operação
    var avgGainPerOp = winners ? grossProfit / winners : 0;
    var avgLossPerOp = losers  ? grossLoss   / losers  : 0;

    // Fator de lucro (profit factor): |lucro bruto| / |prejuízo bruto|
    var profitFactor = grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : null;

    // Expectativa matemática por operação
    var expectancy = total
      ? (winners / total) * avgGainPerOp + (losers / total) * avgLossPerOp
      : 0;

    return {
      total,
      netTotal,
      grossProfit,
      grossLoss,
      winners,
      losers,
      ties,
      winRateOps,
      lossRateOps,
      tieRateOps,
      avgGainPerOp,
      avgLossPerOp,
      profitFactor,
      expectancy
    };
  }

  /* ---- Estatísticas do mês (por dia) + dados de operações ---- */
  function calcStats(days) {
    // Dias operados: exclui feriados e não operados (inclui resultado zero)
    var traded = days.filter(function (d) {
      return d.dayType !== 'holiday' && d.dayType !== 'notOperated';
    });

    var wins   = traded.filter(function (d) { return d.result > 0; });
    var losses = traded.filter(function (d) { return d.result < 0; });

    var totalResult = traded.reduce(function (a, d) { return a + d.result; }, 0);
    var grossProfit = wins.reduce(function (a, d) { return a + d.result; }, 0);
    var grossLoss   = losses.reduce(function (a, d) { return a + d.result; }, 0);
    var totalOps    = traded.reduce(function (a, d) { return a + d.ops; }, 0);
    var avgWin      = wins.length   ? grossProfit / wins.length   : 0;
    var avgLoss     = losses.length ? grossLoss   / losses.length : 0;
    var riskReward  = avgLoss !== 0 ? Math.abs(avgWin / avgLoss)  : 0;

    // ---- DADOS DA ABA OPERAÇÕES (pizza + métricas) ----
    var opValues = getOperationValues(days);
    var ops      = calcOperationsMetrics(opValues);

    // Taxa de acerto de DIAS (para compatibilidade com código original)
    var winRate  = ops.total ? ops.winRateOps : 0;

    return {
      tradedDays: traded.length,
      winDays:    wins.length,
      lossDays:   losses.length,
      totalResult,
      grossProfit,
      grossLoss,
      winRate,          // taxa de acerto POR OPERAÇÃO (alinhado ao gráfico de pizza)
      totalOps,
      avgWin,
      avgLoss,
      riskReward,
      /* Novos campos vindos da aba Operações */
      ops               // objeto completo com todos os dados do painel Operações
    };
  }

  /* ---- Monta o prompt para a IA — enriquecido com dados de Operações ---- */
  function buildPrompt(monthName, year, days, stats) {
    var o = stats.ops; // atalho para dados de operações

    // Filtra apenas dias com anotações no diário
    var journalDays = days.filter(function (d) {
      return d.mistakesMade || d.entryReason || d.tradeResult || d.assetDirection || d.tradePlan;
    });

    var journalText = journalDays.length === 0
      ? '(Nenhuma anotação no Diário de Trading foi encontrada para este mês.)'
      : journalDays.map(function (d) {
          var lines = ['Dia ' + d.date + ' | Resultado: ' + fmtBRL(d.result) + ' | Ops: ' + d.ops + ' | Pontos: ' + d.points];
          if (d.assetDirection)  lines.push('  Ativo/Direção: '    + d.assetDirection);
          if (d.entryReason)     lines.push('  Motivo entrada: '   + d.entryReason);
          if (d.tradePlan)       lines.push('  Plano (E/SL/Alvo): '+ d.tradePlan);
          if (d.tradeResult)     lines.push('  Resultado anotado: '+ d.tradeResult);
          if (d.mistakesMade)    lines.push('  Erros cometidos: '  + d.mistakesMade);
          if (d.dailyStopLoss)   lines.push('  Stop diário: '      + d.dailyStopLoss);
          if (d.profitGoal)      lines.push('  Meta de ganho: '    + d.profitGoal);
          if (d.maxTrades)       lines.push('  Max trades: '       + d.maxTrades);
          if (d.economicCalendar)lines.push('  Cal. econômico: '   + d.economicCalendar);
          return lines.join('\n');
        }).join('\n\n');

    return [
      'Você é um coach de trading profissional altamente experiente. Analise os dados abaixo do mês de ' + monthName + '/' + year + ' de um trader e gere EXATAMENTE 6 insights objetivos em JSON.',
      '',
      '=== ESTATÍSTICAS DO MÊS (por dia) ===',
      'Dias operados: ' + stats.tradedDays,
      'Dias vencedores: ' + stats.winDays,
      'Dias perdedores: ' + stats.lossDays,
      'Resultado total do mês: ' + fmtBRL(stats.totalResult),
      'Lucro bruto (dias positivos): ' + fmtBRL(stats.grossProfit),
      'Prejuízo bruto (dias negativos): ' + fmtBRL(stats.grossLoss),
      'Ganho médio por dia positivo: ' + fmtBRL(stats.avgWin),
      'Perda média por dia negativo: ' + fmtBRL(Math.abs(stats.avgLoss)),
      'Relação risco/retorno (dias): ' + (stats.riskReward ? stats.riskReward.toFixed(2) + ':1' : 'N/A'),
      '',
      '=== DADOS DA ABA OPERAÇÕES (mesmos valores do gráfico de pizza e painel de métricas) ===',
      'Resultado Líquido Total (net): ' + fmtBRL(o.netTotal),
      'Resultado Total (mesma base): ' + fmtBRL(o.netTotal),
      'Lucro Bruto das operações: ' + fmtBRL(o.grossProfit),
      'Prejuízo Bruto das operações: ' + fmtBRL(o.grossLoss),
      'Total de operações individuais: ' + o.total,
      '',
      '--- Gráfico de Pizza — Eficiência por operação ---',
      'Operações Vencedoras: ' + o.winners + ' (' + o.winRateOps.toFixed(1) + '%)',
      'Operações Perdedoras: ' + o.losers  + ' (' + o.lossRateOps.toFixed(1) + '%)',
      'Operações Empatadas:  ' + o.ties    + ' (' + o.tieRateOps.toFixed(1)  + '%)',
      '',
      '--- Indicadores derivados ---',
      'Ganho médio por operação vencedora: ' + fmtBRL(o.avgGainPerOp),
      'Perda média por operação perdedora: ' + fmtBRL(Math.abs(o.avgLossPerOp)),
      'Fator de lucro (Profit Factor): ' + (o.profitFactor !== null ? o.profitFactor.toFixed(2) : 'N/A'),
      'Expectativa matemática por op.: ' + fmtBRL(o.expectancy),
      '',
      '=== DIÁRIO DE TRADING (anotações do trader) ===',
      journalText,
      '',
      '=== FORMATO DE RESPOSTA ===',
      'Responda APENAS com um array JSON válido, sem markdown, sem explicações fora do JSON.',
      'Cada objeto do array deve ter exatamente estas chaves:',
      '  "type": um de ["error","positive","warning","tip","pattern"]',
      '  "icon": um emoji relevante (ex: 🚫 ⚡ ⚠️ 💡 📊)',
      '  "badge": texto curto do tipo (ex: "Erro Recorrente", "Ponto Forte", "Atenção", "Dica", "Padrão")',
      '  "title": título curto e direto (máx 8 palavras)',
      '  "text": análise objetiva (2 a 3 frases, baseada nos dados reais)',
      '  "action": ação concreta a tomar (1 frase, começar com verbo no infinitivo)',
      '',
      'Regras:',
      '- Use os dados reais das OPERAÇÕES INDIVIDUAIS (gráfico de pizza) e não apenas os dados diários',
      '- Destaque a taxa de acerto por operação (' + o.winRateOps.toFixed(1) + '%) e o profit factor (' + (o.profitFactor !== null ? o.profitFactor.toFixed(2) : 'N/A') + ')',
      '- Se o Lucro Bruto das operações (' + fmtBRL(o.grossProfit) + ') for muito maior que o Prejuízo (' + fmtBRL(o.grossLoss) + '), destaque como ponto forte',
      '- Se houver muitas operações empatadas (' + o.ties + '), analise o impacto nos custos operacionais',
      '- Identifique padrões reais de erros mencionados no diário',
      '- Se não houver anotações, baseie-se só nas estatísticas',
      '- Misture tipos: pelo menos 2 "error", 1 "positive", 1 "tip", 1 "warning", 1 "pattern"',
      '- Se o mês foi lucrativo, destaque o que funcionou; se negativo, foque nos erros',
      '- Linguagem: português brasileiro, tom profissional mas direto'
    ].join('\n');
  }

  /* ---- Chama a API Anthropic ---- */
  async function callAI(prompt) {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('API error: ' + response.status);
    var data = await response.json();
    var text = (data.content || []).map(function (b) { return b.text || ''; }).join('');
    // Remove possíveis ```json ``` fences
    text = text.replace(/```json[\s\S]*?```/g, function (m) { return m.slice(7, -3).trim(); });
    text = text.replace(/```[\s\S]*?```/g, function (m) { return m.slice(3, -3).trim(); });
    return JSON.parse(text.trim());
  }

  /* ====================================================================
     BARRA DE RESUMO APRIMORADA
     Agora exibe 9 métricas em 3 linhas:
       Linha 1 (visão geral): Período · Dias Operados · Resultado · Taxa Acerto · R/R · Total Ops
       Linha 2 (dados da aba Operações): Lucro Bruto · Prejuízo Bruto · Profit Factor
       Linha 3 (gráfico de pizza): Vencedoras · Perdedoras · Empatadas
     ==================================================================== */
  function renderSummaryBar(stats, monthName, year) {
    var bar = document.getElementById('insightsSummaryBar');
    if (!bar) return;

    var isPositive = stats.totalResult >= 0;
    var o = stats.ops;

    function makeStat(val, color, label) {
      return '<div class="insightsStat ' + color + '">' +
               '<span class="insightsStatLabel">' + label + '</span>' +
               '<span class="insightsStatValue ' + color + '">' + val + '</span>' +
             '</div>';
    }

    // --- Linha 1: visão geral do mês ---
    var line1 = [
      makeStat(monthName + '/' + year,                         'blue',   'Período'),
      makeStat(stats.tradedDays + ' dias',                     'blue',   'Dias Operados'),
      makeStat(fmtBRL(stats.totalResult), isPositive ? 'green' : 'red',  'Resultado Total'),
      makeStat(o.winRateOps.toFixed(1) + '%',
               o.winRateOps >= 50 ? 'green' : 'amber',                   'Taxa de Acerto'),
      makeStat(stats.riskReward ? stats.riskReward.toFixed(2) + ':1' : 'N/A',
               stats.riskReward >= 1 ? 'green' : 'red',                  'Risco/Retorno'),
      makeStat(o.total + ' ops',                               'purple', 'Total Operações')
    ].join('');

    // --- Linha 2: dados da aba Operações ---
    var pf = o.profitFactor;
    var pfColor = pf === null ? 'blue' : pf >= 1.5 ? 'green' : pf >= 1 ? 'amber' : 'red';
    var pfVal   = pf !== null ? pf.toFixed(2) : 'N/A';

    var line2 = [
      makeStat(fmtBRL(o.grossProfit),                          'green',  'Lucro Bruto'),
      makeStat(fmtBRL(o.grossLoss),                            'red',    'Prejuízo Bruto'),
      makeStat(fmtBRL(o.netTotal), o.netTotal >= 0 ? 'green' : 'red',   'Resultado Líq.'),
      makeStat(fmtBRL(o.avgGainPerOp),                         'green',  'Ganho Méd./Op.'),
      makeStat(fmtBRL(Math.abs(o.avgLossPerOp)),               'red',    'Perda Méd./Op.'),
      makeStat(pfVal,                                           pfColor,  'Profit Factor')
    ].join('');

    // --- Linha 3: gráfico de pizza em texto ---
    var line3 = [
      makeStat(o.winners + ' (' + o.winRateOps.toFixed(1) + '%)',  'green',  'Vencedoras'),
      makeStat(o.losers  + ' (' + o.lossRateOps.toFixed(1) + '%)', 'red',    'Perdedoras'),
      makeStat(o.ties    + ' (' + o.tieRateOps.toFixed(1)  + '%)', 'blue',   'Empatadas'),
      makeStat(fmtBRL(o.expectancy), o.expectancy >= 0 ? 'green' : 'red',    'Expectativa/Op.'),
      makeStat(stats.winDays + ' dias',                             'green',  'Dias Positivos'),
      makeStat(stats.lossDays + ' dias',                            'red',    'Dias Negativos')
    ].join('');

    // Monta as 3 seções com separador visual
    bar.innerHTML =
      '<div class="insightsSummarySection">' +
        '<div class="insightsSummarySectionLabel">📅 Resumo do Mês</div>' +
        '<div class="insightsSummaryRow">' + line1 + '</div>' +
      '</div>' +
      '<div class="insightsSummarySection">' +
        '<div class="insightsSummarySectionLabel">📊 Aba Operações</div>' +
        '<div class="insightsSummaryRow">' + line2 + '</div>' +
      '</div>' +
      '<div class="insightsSummarySection">' +
        '<div class="insightsSummarySectionLabel">🥧 Gráfico de Eficiência (por operação)</div>' +
        '<div class="insightsSummaryRow">' + line3 + '</div>' +
      '</div>';
  }

  /* ---- Renderiza os cards de insights ---- */
  function renderCards(insights) {
    var grid = document.getElementById('insightsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    insights.forEach(function (ins) {
      var card = document.createElement('div');
      card.className = 'insightCard type-' + (ins.type || 'tip');
      card.innerHTML =
        '<div class="insightCardTop">' +
          '<div class="insightCardIcon">' + (ins.icon || '💡') + '</div>' +
          '<span class="insightCardTitle">' + escHtml(ins.title || '') + '</span>' +
          '<span class="insightCardBadge">' + escHtml(ins.badge || '') + '</span>' +
        '</div>' +
        '<div class="insightCardDivider"></div>' +
        '<p class="insightCardText">' + escHtml(ins.text || '') + '</p>' +
        (ins.action
          ? '<span class="insightCardAction">' + escHtml(ins.action) + '</span>'
          : '');
      grid.appendChild(card);
    });
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ---- Atualiza o timestamp ---- */
  function setGeneratedAt(monthName, year) {
    var el = document.getElementById('insightsGeneratedAt');
    if (!el) return;
    var now = new Date();
    el.innerText = 'Gerado em ' + now.toLocaleString('pt-BR') + ' · Análise de ' + monthName + '/' + year;
  }

  /* ---- Atualiza o subtítulo do painel ---- */
  function setSubtitle(monthName, year) {
    var el = document.getElementById('insightsSubtitle');
    if (el) el.innerText = 'Análise inteligente do seu Diário de Trading — ' + monthName + '/' + year;
  }

  /* ---- Mostra/oculta seções ---- */
  function showSection(id) {
    var show = id === 'insightsLoading' ? null : id;
    ['insightsEmpty','insightsLoading','insightsContent'].forEach(function (s) {
      var el = document.getElementById(s);
      if (!el) return;
      if (s === 'insightsLoading') { el.classList.add('hidden'); return; }
      el.classList.toggle('hidden', s !== show);
    });
  }

  /* ---- Mensagem de loading ---- */
  function animateLoadingText() {
    return null;
  }

  /* ---- Função principal de geração ---- */
  async function generateInsights() {
    var btn  = document.getElementById('generateInsightsBtn');
    var rBtn = document.getElementById('regenerateInsightsBtn');

    if (btn)  btn.disabled  = true;
    if (rBtn) rBtn.disabled = true;

    showSection('insightsLoading');
    var loadingTimer = animateLoadingText();

    try {
      var info  = getCurrentMonthYear();
      var days  = collectMonthData(info.year, info.monthIndex);
      var stats = calcStats(days);

      setSubtitle(info.monthName, info.year);

      var prompt   = buildPrompt(info.monthName, info.year, days, stats);
      var insights = await callAI(prompt);

      clearInterval(loadingTimer);

      renderSummaryBar(stats, info.monthName, info.year);
      renderCards(insights);
      setGeneratedAt(info.monthName, info.year);
      showSection('insightsContent');

    } catch (err) {
      clearInterval(loadingTimer);
      console.error('[Insights] Erro:', err);

      // Fallback: gera insights locais sem IA
      var info2  = getCurrentMonthYear();
      var days2  = collectMonthData(info2.year, info2.monthIndex);
      var stats2 = calcStats(days2);

      setSubtitle(info2.monthName, info2.year);
      renderSummaryBar(stats2, info2.monthName, info2.year);
      renderCards(buildFallbackInsights(stats2, days2));
      setGeneratedAt(info2.monthName, info2.year);
      showSection('insightsContent');
    }

    if (btn)  btn.disabled  = false;
    if (rBtn) rBtn.disabled = false;
  }

  /* ====================================================================
     INSIGHTS DE FALLBACK APRIMORADOS
     Agora usam os dados reais da aba Operações (pizza + métricas)
     ==================================================================== */
  function buildFallbackInsights(stats, days) {
    var insights = [];
    var o = stats.ops; // dados da aba Operações

    /* 1. Taxa de acerto POR OPERAÇÃO (alinhada ao gráfico de pizza) */
    if (o.total > 0) {
      var isGoodWin = o.winRateOps >= 55;
      insights.push({
        type: isGoodWin ? 'positive' : 'warning',
        icon: isGoodWin ? '🎯' : '⚠️',
        badge: isGoodWin ? 'Ponto Forte' : 'Atenção',
        title: 'Taxa de acerto: ' + o.winRateOps.toFixed(1) + '% das ops',
        text: 'De ' + o.total + ' operações individuais, ' + o.winners + ' foram vencedoras (' +
              o.winRateOps.toFixed(1) + '%), ' + o.losers + ' perdedoras (' + o.lossRateOps.toFixed(1) + '%)' +
              (o.ties > 0 ? ' e ' + o.ties + ' empatadas (' + o.tieRateOps.toFixed(1) + '%)' : '') + '. ' +
              (isGoodWin
                ? 'Boa consistência! Mantenha critérios rigorosos de seleção de entradas.'
                : 'Taxa abaixo do ideal. Revise seus critérios de entrada e seja mais seletivo.'),
        action: isGoodWin
          ? 'Documentar com detalhe os setups das operações vencedoras para replicá-los.'
          : 'Reduzir o número de operações e operar apenas nos setups de maior confiança.'
      });
    } else if (stats.tradedDays > 0) {
      insights.push({
        type: 'tip', icon: '📝', badge: 'Dica',
        title: 'Registre operações individuais',
        text: 'Os dados de operações individuais não foram encontrados. Para ativar o gráfico de pizza e análises mais precisas, informe o número de operações e seus resultados individuais ao salvar cada dia.',
        action: 'Preencher o campo "Operações" e os resultados individuais no modal de cada dia.'
      });
    }

    /* 2. Profit Factor — indicador chave da aba Operações */
    if (o.total > 0 && o.grossLoss !== 0) {
      var pf = o.profitFactor;
      var goodPF = pf !== null && pf >= 1.5;
      var okPF   = pf !== null && pf >= 1;
      insights.push({
        type: goodPF ? 'positive' : okPF ? 'warning' : 'error',
        icon: goodPF ? '⚖️' : okPF ? '⚠️' : '🚫',
        badge: goodPF ? 'Ponto Forte' : okPF ? 'Atenção' : 'Erro Recorrente',
        title: 'Profit Factor: ' + (pf !== null ? pf.toFixed(2) : 'N/A'),
        text: 'O Lucro Bruto das operações é ' + fmtBRL(o.grossProfit) +
              ' contra um Prejuízo Bruto de ' + fmtBRL(Math.abs(o.grossLoss)) +
              '. ' + (goodPF
                ? 'Excelente! Cada R$ perdido gera ' + (pf !== null ? pf.toFixed(2) : '?') + ' em ganhos. Estratégia com edge positivo comprovado.'
                : okPF
                  ? 'Resultado marginalmente positivo. Foco em aumentar o ganho médio por operação ou reduzir perdas.'
                  : 'Você está perdendo mais do que ganhando em valor bruto. Revise alvos e stops imediatamente.'),
        action: goodPF
          ? 'Manter os alvos atuais e nunca antecipar saída em operações vencedoras.'
          : 'Aumentar o alvo mínimo das operações vencedoras em pelo menos 20%.'
      });
    }

    /* 3. Lucro Bruto vs Prejuízo Bruto (dados diretos da aba Operações) */
    if (o.total > 0) {
      var netIsPos = o.netTotal >= 0;
      insights.push({
        type: netIsPos ? 'positive' : 'error',
        icon: netIsPos ? '📈' : '📉',
        badge: netIsPos ? 'Resultado' : 'Erro Recorrente',
        title: netIsPos ? 'Resultado Líquido positivo' : 'Resultado Líquido negativo',
        text: 'Resultado Líquido Total das operações: ' + fmtBRL(o.netTotal) + '. ' +
              'Lucro Bruto: ' + fmtBRL(o.grossProfit) + ' | Prejuízo Bruto: ' + fmtBRL(Math.abs(o.grossLoss)) + '. ' +
              (netIsPos
                ? 'A diferença de ' + fmtBRL(o.netTotal) + ' reflete uma gestão positiva do capital no mês.'
                : 'O Prejuízo Bruto supera o Lucro Bruto em ' + fmtBRL(Math.abs(o.netTotal)) + '. Revise a relação risco/retorno.'),
        action: netIsPos
          ? 'Revisar as operações mais lucrativas e identificar o setup predominante.'
          : 'Analisar as operações com maior prejuízo e verificar se o stop foi respeitado.'
      });
    }

    /* 4. Expectativa matemática por operação */
    if (o.total > 0) {
      var expPos = o.expectancy >= 0;
      insights.push({
        type: expPos ? 'pattern' : 'error',
        icon: expPos ? '📐' : '🔢',
        badge: 'Padrão',
        title: 'Expectativa: ' + fmtBRL(o.expectancy) + '/operação',
        text: 'Com ganho médio de ' + fmtBRL(o.avgGainPerOp) + ' por op. vencedora e perda média de ' +
              fmtBRL(Math.abs(o.avgLossPerOp)) + ' por op. perdedora, a expectativa matemática é de ' +
              fmtBRL(o.expectancy) + ' por trade. ' +
              (expPos
                ? 'Expectativa positiva confirma um sistema com vantagem estatística (edge).'
                : 'Expectativa negativa significa que, na média, cada operação perde dinheiro — o sistema precisa de ajustes.'),
        action: expPos
          ? 'Aumentar o tamanho das posições de forma gradual para potencializar o edge identificado.'
          : 'Parar de operar e revisar o sistema até obter expectativa matemática positiva em backtesting.'
      });
    }

    /* 5. Erros do diário */
    var allErrors = days.map(function (d) { return d.mistakesMade; }).filter(Boolean).join(' ').toLowerCase();
    if (allErrors) {
      var stopMention  = allErrors.includes('stop');
      var antecipacao  = allErrors.includes('antecip') || allErrors.includes('cedo');
      var revenge      = allErrors.includes('vingan') || allErrors.includes('raiva') || allErrors.includes('emoc');
      var overOps      = allErrors.includes('excesso') || allErrors.includes('muito') || allErrors.includes('over');

      if (stopMention) {
        insights.push({
          type: 'error', icon: '🛑', badge: 'Erro Recorrente',
          title: 'Violação de stop loss identificada',
          text: 'As anotações do diário mencionam situações envolvendo o stop loss. Mover ou não respeitar o stop é um dos erros mais custosos — pode ser o principal responsável pelo Prejuízo Bruto de ' + fmtBRL(Math.abs(o.grossLoss)) + '.',
          action: 'Configurar o stop no sistema antes de entrar na operação e nunca modificá-lo contra a posição.'
        });
      } else if (antecipacao) {
        insights.push({
          type: 'warning', icon: '⏳', badge: 'Atenção',
          title: 'Entradas antecipadas detectadas',
          text: 'Há registros de entradas antes da confirmação do setup. Esse erro sozinho pode reduzir a taxa de acerto de operações (atual: ' + o.winRateOps.toFixed(1) + '%) e aumentar o número de perdedoras (' + o.losers + ').',
          action: 'Aguardar sempre o fechamento do candle de sinal antes de executar a entrada.'
        });
      } else if (revenge) {
        insights.push({
          type: 'error', icon: '😤', badge: 'Erro Recorrente',
          title: 'Trading emocional/vingança detectado',
          text: 'O diário registra operações motivadas por emoção. Esse padrão costuma elevar o número de perdedoras — você teve ' + o.losers + ' ops perdedoras (' + o.lossRateOps.toFixed(1) + '%). Operar emocionalmente destrói o edge do sistema.',
          action: 'Implementar um stop emocional: ao atingir 2 perdas seguidas, encerrar a sessão imediatamente.'
        });
      } else if (overOps) {
        insights.push({
          type: 'warning', icon: '🔁', badge: 'Atenção',
          title: 'Excesso de operações no período',
          text: 'O diário aponta para excesso de operações. Com ' + o.total + ' ops no mês, avalie se cada entrada tinha justificativa técnica clara. Overtrading reduz a qualidade e eleva o Prejuízo Bruto.',
          action: 'Definir um limite diário máximo de operações e registrá-lo na aba Gestão de Risco.'
        });
      } else {
        insights.push({
          type: 'warning', icon: '📋', badge: 'Atenção',
          title: 'Erros registrados no diário',
          text: 'Foram identificadas anotações de erros no Diário de Trading. Revisá-los à luz das ' + o.losers + ' operações perdedoras pode revelar padrões de comportamento que estão custando lucro.',
          action: 'Listar os 3 erros mais frequentes do mês e criar uma regra específica para cada um.'
        });
      }
    } else {
      /* 5b. Sem diário — usa os dados das operações para gerar insight sobre empatadas */
      if (o.ties > 0 && o.total > 0) {
        insights.push({
          type: 'tip', icon: '🔄', badge: 'Dica',
          title: o.ties + ' operações empatadas no mês',
          text: 'Operações empatadas (' + o.tieRateOps.toFixed(1) + '% do total) geralmente indicam saída no breakeven após mover o stop. Embora protejam o capital, geram custos operacionais (corretagem/taxa) que pesam no resultado líquido (' + fmtBRL(o.netTotal) + ').',
          action: 'Avaliar se as saídas no breakeven estão sendo prematuras ou se é uma estratégia intencional de gestão de risco.'
        });
      } else {
        insights.push({
          type: 'tip', icon: '💡', badge: 'Dica',
          title: 'Preencha o diário todos os dias',
          text: 'Quanto mais detalhadas as anotações, mais precisos são os insights gerados pela IA. Registre sempre o motivo da entrada, os erros e o resultado emocional do dia.',
          action: 'Reservar 5 minutos após cada sessão para preencher todos os campos do diário.'
        });
      }
    }

    /* 6. Padrão de dias — sempre presente */
    if (stats.tradedDays > 0) {
      insights.push({
        type: 'pattern', icon: '📅', badge: 'Padrão',
        title: 'Distribuição: ' + stats.winDays + ' dias pos. · ' + stats.lossDays + ' dias neg.',
        text: 'Você teve ' + stats.winDays + ' dias positivos e ' + stats.lossDays + ' dias negativos em ' +
              stats.tradedDays + ' dias operados. ' +
              'A nível de operações, foram ' + o.winners + ' vencedoras e ' + o.losers + ' perdedoras de ' +
              o.total + ' no total. ' +
              (stats.riskReward >= 1
                ? 'A relação risco/retorno de ' + stats.riskReward.toFixed(2) + ':1 é favorável.'
                : 'A relação risco/retorno de ' + stats.riskReward.toFixed(2) + ':1 precisa ser melhorada.'),
        action: 'Mapear em quais dias da semana ou horários os resultados são melhores ou piores e concentrar as operações nesses momentos.'
      });
    }

    return insights.slice(0, 6);
  }

  /* ---- Inicialização: botões ---- */
  function init() {
    var btn  = document.getElementById('generateInsightsBtn');
    var rBtn = document.getElementById('regenerateInsightsBtn');

    if (btn)  btn.addEventListener('click',  generateInsights);
    if (rBtn) rBtn.addEventListener('click', generateInsights);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
