/* ===================================================================
   INSIGHTS.JS — Análise inteligente do Diário de Trading via IA
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
    // monthLabel tem texto como "Junho/2026"
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

  /* ---- Estatísticas do mês ----
     Taxa de acerto espelha o grafico de Pizza da aba Operacoes:
     expande cada dia em suas operacoes individuais (operationResults),
     classifica cada operacao como vencedora (>0), perdedora (<0) ou empatada (=0).
  ---- */
  function calcStats(days) {
    // Dias operados: exclui feriados e nao operados (inclui resultado zero)
    var traded = days.filter(function (d) { return d.dayType !== 'holiday' && d.dayType !== 'notOperated'; });

    // Totais financeiros por dia
    var wins   = traded.filter(function (d) { return d.result > 0; });
    var losses = traded.filter(function (d) { return d.result < 0; });
    var totalResult = traded.reduce(function (a, d) { return a + d.result; }, 0);
    var grossProfit = wins.reduce(function (a, d) { return a + d.result; }, 0);
    var grossLoss   = losses.reduce(function (a, d) { return a + d.result; }, 0);
    var totalOps    = traded.reduce(function (a, d) { return a + d.ops; }, 0);
    var avgWin      = wins.length   ? grossProfit / wins.length   : 0;
    var avgLoss     = losses.length ? grossLoss   / losses.length : 0;
    var riskReward  = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    // Taxa de acerto: mesma logica do getOperationEntries + getEfficiencySlices do script.js
    // expande operationResults individuais; se nao houver, usa resultado do dia como 1 operacao
    var allOpValues = [];
    traded.forEach(function (d) {
      var hasOpData = (d.operationResults && d.operationResults.length > 0) || d.ops > 0 || d.result !== 0;
      if (!hasOpData) return;
      var saved = Array.isArray(d.operationResults) ? d.operationResults : [];
      if (saved.length > 0) {
        saved.forEach(function (v) { allOpValues.push(Number(v || 0)); });
      } else if (d.ops > 0 || d.result !== 0) {
        allOpValues.push(Number(d.result || 0));
      }
    });

    var opWins  = allOpValues.filter(function (v) { return v > 0; }).length;
    var winRate = allOpValues.length ? (opWins / allOpValues.length) * 100 : 0;

    return {
      tradedDays: traded.length,
      winDays:    wins.length,
      lossDays:   losses.length,
      totalResult, grossProfit, grossLoss,
      winRate, totalOps, avgWin, avgLoss, riskReward
    };
  }

  /* ---- Monta o prompt para a IA ---- */
  function buildPrompt(monthName, year, days, stats) {
    // Filtra apenas dias com anotações no diário
    var journalDays = days.filter(function (d) {
      return d.mistakesMade || d.entryReason || d.tradeResult || d.assetDirection || d.tradePlan;
    });

    var journalText = journalDays.length === 0
      ? '(Nenhuma anotação no Diário de Trading foi encontrada para este mês.)'
      : journalDays.map(function (d) {
          var lines = ['Dia ' + d.date + ' | Resultado: ' + fmtBRL(d.result) + ' | Ops: ' + d.ops + ' | Pontos: ' + d.points];
          if (d.assetDirection)  lines.push('  Ativo/Direção: '   + d.assetDirection);
          if (d.entryReason)     lines.push('  Motivo entrada: '  + d.entryReason);
          if (d.tradePlan)       lines.push('  Plano (E/SL/Alvo): '+ d.tradePlan);
          if (d.tradeResult)     lines.push('  Resultado anotado: '+ d.tradeResult);
          if (d.mistakesMade)    lines.push('  Erros cometidos: ' + d.mistakesMade);
          if (d.dailyStopLoss)   lines.push('  Stop diário: '     + d.dailyStopLoss);
          if (d.profitGoal)      lines.push('  Meta de ganho: '   + d.profitGoal);
          if (d.maxTrades)       lines.push('  Max trades: '      + d.maxTrades);
          if (d.economicCalendar)lines.push('  Cal. econômico: '  + d.economicCalendar);
          return lines.join('\n');
        }).join('\n\n');

    return [
      'Você é um coach de trading profissional altamente experiente. Analise os dados abaixo do mês de ' + monthName + '/' + year + ' de um trader e gere EXATAMENTE 6 insights objetivos em JSON.',
      '',
      '=== ESTATÍSTICAS DO MÊS ===',
      'Dias operados: ' + stats.tradedDays,
      'Dias vencedores: ' + stats.winDays,
      'Dias perdedores: ' + stats.lossDays,
      'Taxa de acerto: ' + stats.winRate.toFixed(1) + '%',
      'Resultado total: ' + fmtBRL(stats.totalResult),
      'Lucro bruto: ' + fmtBRL(stats.grossProfit),
      'Prejuízo bruto: ' + fmtBRL(stats.grossLoss),
      'Total de operações: ' + stats.totalOps,
      'Ganho médio por dia positivo: ' + fmtBRL(stats.avgWin),
      'Perda média por dia negativo: ' + fmtBRL(stats.avgLoss),
      'Relação risco/retorno: ' + (stats.riskReward ? stats.riskReward.toFixed(2) + ':1' : 'N/A'),
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
      '- Seja específico e direto, use os dados reais (valores, percentuais, dias)',
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

  /* ---- Renderiza a barra de resumo ---- */
  function renderSummaryBar(stats, monthName, year) {
    var bar = document.getElementById('insightsSummaryBar');
    if (!bar) return;
    var isPositive = stats.totalResult >= 0;
    bar.innerHTML = [
      makeStat(monthName + '/' + year,                   'blue',   'Período'),
      makeStat(stats.tradedDays + ' dias',               'blue',   'Dias Operados'),
      makeStat(fmtBRL(stats.totalResult), isPositive ? 'green' : 'red', 'Resultado'),
      makeStat(stats.winRate.toFixed(1) + '%',
               stats.winRate >= 50 ? 'green' : 'amber', 'Taxa de Acerto'),
      makeStat(stats.riskReward ? stats.riskReward.toFixed(2) + ':1' : 'N/A',
               stats.riskReward >= 1 ? 'green' : 'red', 'Risco/Retorno'),
      makeStat(stats.totalOps + ' ops',                 'purple', 'Total Operações')
    ].join('');

    function makeStat(val, color, label) {
      return '<div class="insightsStat ' + color + '">' +
               '<span class="insightsStatLabel">' + label + '</span>' +
               '<span class="insightsStatValue ' + color + '">' + val + '</span>' +
             '</div>';
    }
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

  /* ---- Mostra/oculta seções (loading sempre oculto) ---- */
  function showSection(id) {
    // Se tentar mostrar loading, mantém o estado atual (empty ou content)
    var show = id === 'insightsLoading' ? null : id;
    ['insightsEmpty','insightsLoading','insightsContent'].forEach(function (s) {
      var el = document.getElementById(s);
      if (!el) return;
      if (s === 'insightsLoading') { el.classList.add('hidden'); return; }
      el.classList.toggle('hidden', s !== show);
    });
  }

  /* ---- Mensagem de loading (desativada — só botão manual) ---- */
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

  /* ---- Insights de fallback (sem IA / sem dados) ---- */
  function buildFallbackInsights(stats, days) {
    var insights = [];

    // Taxa de acerto
    if (stats.tradedDays > 0) {
      var isGoodWin = stats.winRate >= 55;
      insights.push({
        type: isGoodWin ? 'positive' : 'warning',
        icon: isGoodWin ? '🎯' : '⚠️',
        badge: isGoodWin ? 'Ponto Forte' : 'Atenção',
        title: 'Taxa de acerto de ' + stats.winRate.toFixed(1) + '%',
        text: 'No mês analisado, você venceu ' + stats.winDays + ' de ' + stats.tradedDays + ' dias operados. ' +
              (isGoodWin
                ? 'Excelente consistência! Mantenha a disciplina na seleção de entradas.'
                : 'Taxa abaixo do ideal. Revise seus critérios de entrada e seja mais seletivo.'),
        action: isGoodWin
          ? 'Documentar com detalhe os setups que funcionaram para replicá-los.'
          : 'Reduzir o número de operações e operar apenas nos setups de maior confiança.'
      });
    }

    // Risco/retorno
    if (stats.riskReward > 0) {
      var goodRR = stats.riskReward >= 1.5;
      insights.push({
        type: goodRR ? 'positive' : 'error',
        icon: goodRR ? '⚖️' : '🚫',
        badge: goodRR ? 'Ponto Forte' : 'Erro Recorrente',
        title: 'Relação risco/retorno: ' + stats.riskReward.toFixed(2) + ':1',
        text: goodRR
          ? 'Seu ganho médio (' + fmtBRL(stats.avgWin) + ') supera sua perda média (' + fmtBRL(Math.abs(stats.avgLoss)) + '). Isso é fundamental para consistência a longo prazo.'
          : 'Sua perda média (' + fmtBRL(Math.abs(stats.avgLoss)) + ') está próxima ou acima do ganho médio (' + fmtBRL(stats.avgWin) + '). Revise seus stops e alvos.',
        action: goodRR
          ? 'Manter os alvos atuais e nunca antecipar saída em operações vencedoras.'
          : 'Definir alvo mínimo de 1,5x o risco antes de entrar em qualquer operação.'
      });
    }

    // Erros mais comuns
    var allErrors = days.map(function (d) { return d.mistakesMade; }).filter(Boolean).join(' ').toLowerCase();
    if (allErrors) {
      var stopMention = allErrors.includes('stop');
      var antecipaçao = allErrors.includes('antecip') || allErrors.includes('cedo');
      if (stopMention) {
        insights.push({
          type: 'error', icon: '🛑', badge: 'Erro Recorrente',
          title: 'Violação de stop loss identificada',
          text: 'As anotações do diário mencionam situações envolvendo o stop loss. Mover ou não respeitar o stop é um dos erros mais custosos no trading.',
          action: 'Configurar o stop no sistema antes de entrar na operação e nunca modificá-lo contra a posição.'
        });
      }
      if (antecipaçao) {
        insights.push({
          type: 'warning', icon: '⏳', badge: 'Atenção',
          title: 'Entradas antecipadas detectadas',
          text: 'Há registros de entradas antes da confirmação do setup. Entrar cedo aumenta o risco e diminui a qualidade das operações.',
          action: 'Aguardar sempre o fechamento do candle de sinal antes de executar a entrada.'
        });
      }
    }

    // Resultado geral
    var isPos = stats.totalResult >= 0;
    insights.push({
      type: isPos ? 'positive' : 'error',
      icon: isPos ? '📈' : '📉',
      badge: isPos ? 'Resultado' : 'Erro Recorrente',
      title: isPos ? 'Mês encerrado no positivo' : 'Mês encerrado no negativo',
      text: 'Resultado total de ' + fmtBRL(stats.totalResult) + ' com ' + stats.tradedDays + ' dias operados. ' +
            (isPos
              ? 'Lucro bruto de ' + fmtBRL(stats.grossProfit) + '. Consistência é a chave para replicar esse desempenho.'
              : 'Prejuízo bruto de ' + fmtBRL(stats.grossLoss) + '. Identifique os padrões dos dias negativos para não repeti-los.'),
      action: isPos
        ? 'Revisar os dias mais lucrativos e identificar o setup predominante.'
        : 'Analisar os dias de maior perda e verificar se o stop diário foi respeitado.'
    });

    // Dica geral
    insights.push({
      type: 'tip', icon: '💡', badge: 'Dica',
      title: 'Preencha o diário todos os dias',
      text: 'Quanto mais detalhadas as anotações, mais precisos são os insights gerados pela IA. Registre sempre o motivo da entrada, os erros e o resultado emocional do dia.',
      action: 'Reservar 5 minutos após cada sessão para preencher todos os campos do diário.'
    });

    // Padrão de dias
    if (stats.tradedDays > 0) {
      insights.push({
        type: 'pattern', icon: '📊', badge: 'Padrão',
        title: 'Análise de distribuição dos dias',
        text: 'Você teve ' + stats.winDays + ' dias positivos e ' + stats.lossDays + ' dias negativos. ' +
              'A relação ganho/perda médio indica ' + (stats.riskReward >= 1 ? 'que você recupera mais do que perde por dia — sinal positivo.' : 'que as perdas superam os ganhos em valores unitários — ponto de atenção crítico.'),
        action: 'Mapear em quais dias da semana ou horários os resultados são melhores ou piores.'
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
