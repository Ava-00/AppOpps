(function () {
  const originalPages = window.WP.pages;
  const personas = window.WP.personas;
  const SESSIONS_PER_COMBO = 60;

  let pool = originalPages.map(p => ({ ...p })); // grows as generated variants are accepted
  let generation = 0;
  let totalSessions = 0;
  let history = [];
  let pendingVariant = null;
  let pendingVariantRate = null;

  const els = {
    pagesGrid: document.getElementById('pagesGrid'),
    runBtn: document.getElementById('runBtn'),
    acceptBtn: document.getElementById('acceptBtn'),
    sessionBadge: document.getElementById('sessionBadge'),
    genBadge: document.getElementById('genBadge'),
    behaviorSection: document.getElementById('behaviorSection'),
    behaviorPanel: document.getElementById('behaviorPanel'),
    rankSection: document.getElementById('rankSection'),
    rankPanel: document.getElementById('rankPanel'),
    genSection: document.getElementById('genSection'),
    genPanel: document.getElementById('genPanel'),
    explainSection: document.getElementById('explainSection'),
    explainPanel: document.getElementById('explainPanel'),
    historyWrap: document.getElementById('historyWrap'),
    historyList: document.getElementById('historyList'),
  };

  function pct(n) { return Math.round(n * 100); }

  function renderInitialGrid() {
    els.pagesGrid.innerHTML = originalPages.map(p => `
      <div class="page-card">
        <div class="frame-wrap"><iframe src="${p.file}"></iframe></div>
        <div class="meta">
          <div class="name">${p.name}</div>
          <div class="persona">${p.angle}</div>
          <a href="${p.file}" target="_blank" rel="noopener">Open full page &rarr;</a>
        </div>
      </div>
    `).join('');
  }

  function barRow(label, widthPct, valLabel, alt) {
    return `<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill${alt ? ' alt' : ''}" style="width:${Math.max(2, Math.round(widthPct))}%"></div></div><div class="bar-val">${valLabel}</div></div>`;
  }

  function renderBehavior(analysis) {
    let html = '<h3 style="font-size:14px;color:var(--muted);margin-bottom:14px;">Conversion rate by page</h3>';
    const maxConv = Math.max(...analysis.byPage.map(p => p.conversionRate), 0.01);
    analysis.byPage.forEach(p => {
      html += barRow(p.name, (p.conversionRate / maxConv) * 100, pct(p.conversionRate) + '%');
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 14px;">Avg scroll depth by page</h3>';
    analysis.byPage.forEach(p => {
      html += barRow(p.name, p.avgScrollDepth, Math.round(p.avgScrollDepth) + '%', true);
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 14px;">Conversion rate by persona &times; page</h3>';
    html += '<table class="data"><thead><tr><th>Persona</th>' + analysis.byPage.map(p => `<th>${p.name}</th>`).join('') + '</tr></thead><tbody>';
    personas.forEach(persona => {
      html += '<tr><td>' + persona.name + '</td>';
      analysis.byPage.forEach(p => {
        const rec = analysis.personaPageMatrix[persona.id + '|' + p.pageId];
        const rate = rec ? rec.clicks / rec.n : 0;
        html += `<td class="num">${pct(rate)}%</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    els.behaviorPanel.innerHTML = html;
    els.behaviorSection.style.display = 'block';
  }

  function renderRanking(analysis) {
    let html = '<div class="rank-list">';
    analysis.ranked.forEach((p, i) => {
      html += `<div class="rank-item${i === 0 ? ' winner' : ''}">
        <div class="place">#${i + 1}</div>
        <div class="info"><div class="name">${p.name}</div><div class="angle">${p.angle}</div></div>
        <div class="metric"><div class="val">${pct(p.conversionRate)}%</div><div class="lab">conversion</div></div>
      </div>`;
    });
    html += '</div>';
    els.rankPanel.innerHTML = html;
    els.rankSection.style.display = 'block';
  }

  function buildVariantDoc(variant) {
    const middle = variant.sections.slice(1, -1);
    const middleHTML = middle.map(s => `<section>${s.bodyHTML}</section>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="css/styles.css"></head>
      <body>
      <div class="lp">
        <div class="wordmark">AppOpps</div>
        <section>${variant.sections[0].bodyHTML}</section>
        ${middleHTML}
        <section class="cta-block-wrap">
          <div class="cta-block">
            <h2>Awaiting orders</h2>
            <a class="btn" href="#">${variant.ctaCopy}</a>
          </div>
        </section>
      </div>
      </body></html>`;
  }

  function renderGenerated(variant, variantRate, prevBestRate) {
    els.genPanel.innerHTML = `
      <div class="gen-frame-wrap"><iframe id="genFrame"></iframe></div>
      <table class="data">
        <tbody>
          <tr><td>Projected conversion (re-simulated on its own)</td><td class="num">${pct(variantRate)}%</td></tr>
          <tr><td>Previous best in pool</td><td class="num">${pct(prevBestRate)}%</td></tr>
          <tr><td>Lift</td><td class="num">${variantRate >= prevBestRate ? '+' : ''}${(variantRate - prevBestRate) * 100 | 0} pts</td></tr>
        </tbody>
      </table>
    `;
    document.getElementById('genFrame').srcdoc = buildVariantDoc(variant);
    els.genSection.style.display = 'block';

    els.explainPanel.innerHTML = `<div class="explain">${variant.explanationHTML}</div>`;
    els.explainSection.style.display = 'block';
  }

  function renderHistory() {
    if (!history.length) return;
    els.historyWrap.style.display = 'block';
    els.historyList.innerHTML = history.map((h, i) => `
      <div class="gen-chip${i === history.length - 1 ? ' best' : ''}">
        <div class="g">op ${h.generation}</div>
        <div class="rate">${pct(h.bestRate)}%</div>
        <div style="color:var(--muted);font-size:11px;">${h.bestName}</div>
      </div>
    `).join('');
  }

  function variantToPageObject(variant) {
    return {
      id: variant.id, file: null, name: variant.name, angle: variant.angle,
      messageTag: variant.messageTag, headline: variant.headline, ctaCopy: variant.ctaCopy,
      sections: variant.sections
    };
  }

  function runCycle() {
    els.runBtn.disabled = true;
    els.acceptBtn.disabled = true;

    // 1. simulate the current pool
    const sessions = window.WP.runSimulation(pool, personas, SESSIONS_PER_COMBO);
    totalSessions += sessions.length;
    const analysis = window.WP.analyzeSessions(sessions, pool);

    renderBehavior(analysis);
    renderRanking(analysis);

    const prevBest = analysis.ranked[0].conversionRate;

    // 2. generate TWO candidate variants - one built from the top page, one
    // from the runner-up - and simulate both, since a rule-based synthesis
    // isn't guaranteed to beat the source it was built from. Keeping only
    // the actual best-performing candidate is the "experimentation" part.
    generation += 1;
    const candidateA = window.WP.generateVariant(analysis, pool, generation, 0);
    const candidates = [candidateA];
    if (analysis.ranked.length > 1) {
      candidates.push(window.WP.generateVariant(analysis, pool, generation, 1));
    }

    const scored = candidates.map(c => {
      const s = window.WP.runSimulation([variantToPageObject(c)], personas, SESSIONS_PER_COMBO);
      totalSessions += s.length;
      const rate = s.filter(x => x.clicked).length / s.length;
      return { variant: c, rate };
    });
    scored.sort((a, b) => b.rate - a.rate);
    const chosen = scored[0];
    const variant = chosen.variant;
    const variantRate = chosen.rate;

    if (scored.length > 1) {
      variant.explanationHTML += ` <em>(${scored.length} candidate variants were generated this round - one from ${scored[0].variant.candidateSource}, one from ${scored[1].variant.candidateSource} - and simulated independently; this one performed better, at ${pct(chosen.rate)}% vs ${pct(scored[1].rate)}%.)</em>`;
    }

    renderGenerated(variant, variantRate, prevBest);

    history.push({ generation, bestRate: Math.max(prevBest, variantRate), bestName: variantRate >= prevBest ? variant.name : analysis.ranked[0].name });
    renderHistory();

    els.sessionBadge.textContent = totalSessions.toLocaleString() + ' sessions of recon logged';
    els.genBadge.textContent = 'operation ' + generation;

    pendingVariant = variant;
    pendingVariantRate = variantRate;

    els.runBtn.disabled = false;
    els.acceptBtn.disabled = false;
    els.runBtn.textContent = 'Run simulation & generate next variant';
  }

  els.runBtn.addEventListener('click', runCycle);

  els.acceptBtn.addEventListener('click', function () {
    if (!pendingVariant) return;
    pool.push(variantToPageObject(pendingVariant));
    pendingVariant = null;
    els.acceptBtn.disabled = true;
    runCycle();
  });

  renderInitialGrid();
})();
