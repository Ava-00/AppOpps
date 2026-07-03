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

  // Runs the simulation several extra times on the same pool and measures
  // how much each page's conversion rate wobbles purely from sampling
  // randomness - not from any real change. This is what "fluctuation"
  // means here: the band you'd see even if nothing about the pages changed
  // between runs. A difference between two pages smaller than this band
  // isn't a reliable signal yet.
  function estimateFluctuation(pagesForSim, replicates, sessionsPerCombo) {
    const perPage = {};
    pagesForSim.forEach(p => { perPage[p.id] = []; });
    for (let r = 0; r < replicates; r++) {
      const sess = window.WP.runSimulation(pagesForSim, personas, sessionsPerCombo);
      const an = window.WP.analyzeSessions(sess, pagesForSim);
      an.byPage.forEach(p => { perPage[p.pageId].push(p.conversionRate); });
    }
    const out = {};
    Object.keys(perPage).forEach(id => {
      const vals = perPage[id];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      out[id] = { min: Math.min(...vals), max: Math.max(...vals), mean, band: Math.max(...vals) - Math.min(...vals) };
    });
    return out;
  }

  function stripHTML(html) { return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

  function pageStats(p) {
    const sectionCount = p.sections.length;
    const chipCount = p.sections.reduce((n, s) => n + (s.chips ? s.chips.length : 0), 0);
    const ctaCount = p.sections.filter(s => s.role === 'cta').length;
    let words = 0;
    p.sections.forEach(s => {
      words += stripHTML(s.bodyHTML).split(' ').filter(Boolean).length;
      if (s.chips) s.chips.forEach(c => { words += stripHTML(c.label).split(' ').filter(Boolean).length; });
    });
    return { sectionCount, chipCount, ctaCount, words };
  }

  function renderInitialGrid() {
    els.pagesGrid.innerHTML = originalPages.map(p => {
      const st = pageStats(p);
      return `
      <div class="page-card">
        <div class="frame-wrap"><iframe src="${p.file}"></iframe></div>
        <div class="meta">
          <div class="name">${p.name}</div>
          <div class="persona">${p.angle}</div>
          <div class="page-stat-strip mono">${st.sectionCount} sections &middot; ${st.chipCount} chips &middot; ${st.words} words &middot; tag: ${p.messageTag}</div>
          ${p.hypothesis ? `<div class="page-hypothesis">${p.hypothesis}</div>` : ''}
          <a href="${p.file}" target="_blank" rel="noopener">Open full page &rarr;</a>
        </div>
      </div>
    `;
    }).join('');
  }

  function barRow(label, widthPct, valLabel, alt) {
    return `<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill${alt ? ' alt' : ''}" style="width:${Math.max(2, Math.round(widthPct))}%"></div></div><div class="bar-val">${valLabel}</div></div>`;
  }

  function rangeBarRow(label, meanPct, minPct, maxPct) {
    const w = v => Math.max(0, Math.min(100, Math.round(v)));
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track" style="position:relative;">
        <div style="position:absolute;top:0;bottom:0;left:${w(minPct)}%;width:${Math.max(2, w(maxPct) - w(minPct))}%;background:rgba(232,163,61,0.3);border-radius:4px;"></div>
        <div style="position:absolute;top:-2px;bottom:-2px;left:${w(meanPct)}%;width:2px;background:var(--accent);"></div>
      </div>
      <div class="bar-val">${Math.round(meanPct)}% <span style="color:var(--muted);font-size:10px;">(${Math.round(minPct)}&ndash;${Math.round(maxPct)}%)</span></div>
    </div>`;
  }

  function segmentBarRow(label, skipPct, skimPct, readPct) {
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track" style="display:flex;overflow:hidden;">
        <div style="width:${Math.round(skipPct * 100)}%;background:var(--danger);opacity:0.55;"></div>
        <div style="width:${Math.round(skimPct * 100)}%;background:var(--accent);opacity:0.5;"></div>
        <div style="width:${Math.round(readPct * 100)}%;background:var(--accent-2);"></div>
      </div>
      <div class="bar-val" style="width:auto;font-size:10px;white-space:nowrap;">${Math.round(skipPct * 100)}/${Math.round(skimPct * 100)}/${Math.round(readPct * 100)}</div>
    </div>`;
  }

  function metricNote(key) {
    const text = window.WP.metricExplainers[key];
    return text ? `<p style="font-size:12px;color:var(--muted);margin:-8px 0 14px;max-width:64ch;">${text}</p>` : '';
  }

  function renderBehavior(analysis, fluctuation, multiVisit, headlineTest) {
    let html = '<h3 style="font-size:14px;color:var(--muted);margin-bottom:4px;">Conversion rate by page</h3>';
    html += metricNote('conversion');
    const maxConv = Math.max(...analysis.byPage.map(p => p.conversionRate), 0.01);
    analysis.byPage.forEach(p => {
      html += barRow(p.name, (p.conversionRate / maxConv) * 100, pct(p.conversionRate) + '%');
    });

    if (fluctuation) {
      html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Conversion rate stability (5 repeated runs, same pool)</h3>';
      html += metricNote('fluctuation');
      analysis.byPage.forEach(p => {
        const f = fluctuation[p.pageId];
        if (f) html += rangeBarRow(p.name, pct(f.mean), pct(f.min), pct(f.max));
      });
    }

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Avg scroll depth by page</h3>';
    html += metricNote('scrollDepth');
    analysis.byPage.forEach(p => {
      html += barRow(p.name, p.avgScrollDepth, Math.round(p.avgScrollDepth) + '%', true);
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Section engagement: skip / skim / read</h3>';
    html += metricNote('engagementMix');
    analysis.byPage.forEach(p => {
      html += segmentBarRow(p.name, p.engagementMix.skipPct, p.engagementMix.skimPct, p.engagementMix.readPct);
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">CTA hesitation (avg seconds before deciding)</h3>';
    html += metricNote('ctaHesitation');
    const maxHes = Math.max(...analysis.byPage.map(p => p.avgCtaHesitation), 1);
    analysis.byPage.forEach(p => {
      html += barRow(p.name, (p.avgCtaHesitation / maxHes) * 100, p.avgCtaHesitation.toFixed(1) + 's');
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Save/return intent among non-converters</h3>';
    html += metricNote('saveIntent');
    analysis.byPage.forEach(p => {
      html += barRow(p.name, p.saveIntentRate * 100, pct(p.saveIntentRate) + '%', true);
    });

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Where visitors actually leave</h3>';
    html += metricNote('bounceBreakdown');
    html += '<table class="data"><thead><tr><th>Page</th><th>Top drop-off point</th><th>Share of bounces</th></tr></thead><tbody>';
    analysis.byPage.forEach(p => {
      const top = p.bounceBreakdown[0];
      if (top) html += `<tr><td>${p.name}</td><td>${top.label}</td><td class="num">${pct(top.share)}%</td></tr>`;
      else html += `<tr><td>${p.name}</td><td style="color:var(--muted)">no bounces this run</td><td class="num">&mdash;</td></tr>`;
    });
    html += '</tbody></table>';

    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Which chip led, per list-style section</h3>';
    html += metricNote('chipEngagement');
    html += '<table class="data"><thead><tr><th>Page</th><th>Section</th><th>Top chip</th><th>Win share</th></tr></thead><tbody>';
    analysis.byPage.forEach(p => {
      p.sectionStats.filter(s => s.chipRanking && s.chipRanking.length).forEach(s => {
        const top = s.chipRanking[0];
        const totalWins = s.chipRanking.reduce((sum, c) => sum + c.wins, 0);
        const share = totalWins ? Math.round((top.wins / totalWins) * 100) : 0;
        html += `<tr><td>${p.name}</td><td>${s.label}</td><td>${top.label}</td><td class="num">${share}%</td></tr>`;
      });
    });
    html += '</tbody></table>';

    if (multiVisit) {
      html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Multi-visit conversion (up to 3 tries)</h3>';
      html += metricNote('multiVisit');
      html += '<table class="data"><thead><tr><th>Page</th><th>First-visit only</th><th>Multi-visit</th><th>Avg visits to convert</th><th>Return rate</th></tr></thead><tbody>';
      multiVisit.forEach(p => {
        html += `<tr><td>${p.name}</td><td class="num">${pct(p.firstVisitRate)}%</td><td class="num">${pct(p.multiVisitRate)}%</td><td class="num">${p.avgVisitsToConvert ? p.avgVisitsToConvert.toFixed(1) : '\u2014'}</td><td class="num">${pct(p.returnRate)}%</td></tr>`;
      });
      html += '</tbody></table>';
    }

    if (headlineTest) {
      html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Headline isolation test (everything else held constant)</h3>';
      html += metricNote('headlineIsolation');
      html += `<p style="font-size:12px;color:var(--muted);margin:-4px 0 10px;">Base page: ${headlineTest.baseName}. Every row below uses that page's sections and CTA unchanged - only the headline differs.</p>`;
      html += '<table class="data"><thead><tr><th>Headline source</th><th>Projected conversion</th></tr></thead><tbody>';
      headlineTest.results.forEach(r => {
        html += `<tr${r.isControl ? ' class="winner"' : ''}><td>${r.source}${r.isControl ? ' <span class="mono" style="color:var(--accent-2);font-size:10px;">current</span>' : ''}</td><td class="num">${pct(r.rate)}%</td></tr>`;
      });
      html += '</tbody></table>';
    }

    const influence = window.WP.computeMetricInfluence(analysis.byPage);
    html += '<h3 style="font-size:14px;color:var(--muted);margin:24px 0 4px;">Which metric actually differentiates pages this round</h3>';
    html += metricNote('metricInfluence');
    const maxSpread = Math.max(...influence.map(m => m.spread), 0.01);
    influence.forEach((m, i) => {
      html += barRow(m.label + (i === 0 ? ' \u2190 most differentiating' : ''), (m.spread / maxSpread) * 100, m.fmt(m.min) + '\u2013' + m.fmt(m.max), i === 0);
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

  function renderChips(chips, style) {
    if (!chips || !chips.length) return '';
    if (style === 'privacy-note') {
      return chips.map(c => `<div class="privacy-note" style="margin-bottom:12px;"><div class="dot"></div><div>${c.label}</div></div>`).join('');
    }
    return '<div class="feature-grid">' + chips.map(c =>
      `<div class="card"><div class="stat">${c.stat}</div><div class="label">${c.label}</div></div>`
    ).join('') + '</div>';
  }

  function buildVariantDoc(variant) {
    const middle = variant.sections.slice(1, -1);
    const middleHTML = middle.map(s => `<section>${s.bodyHTML}${renderChips(s.chips, s.chipStyle)}</section>`).join('');
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
      <script src="js/mock-data.js"></script>
      </body></html>`;
  }

  function renderDiffTable(variant) {
    const rows = [];
    const d = variant.diff;
    rows.push(['Headline', d.headline.value, d.headline.value, false]);
    if (d.sectionSwap) {
      rows.push(['Section', d.sectionSwap.fromLabel + ' (' + d.sectionSwap.fromDwell + 's dwell)', d.sectionSwap.toLabel + ' from ' + d.sectionSwap.toPage + ' (' + d.sectionSwap.toDwell + 's dwell)', true]);
    } else {
      rows.push(['Section', 'no change', 'no change', false]);
    }
    (d.chipChecks || []).filter(c => c.changed).forEach(c => {
      rows.push(['List order in "' + c.sectionLabel + '"', '(original order)', '"' + c.topLabel + '" moved to front (' + c.wins + '/' + c.total + ' wins)', true]);
    });
    if (d.ctaChange) {
      rows.push(['CTA copy', '"' + d.ctaChange.from + '"', '"' + d.ctaChange.to + '" (from ' + d.ctaChange.toPage + ')', true]);
    } else {
      rows.push(['CTA copy', variant.ctaCopy, variant.ctaCopy, false]);
    }
    let html = '<table class="data" style="margin-bottom:20px;"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>';
    rows.forEach(r => {
      html += `<tr${r[3] ? ' class="winner"' : ''}><td>${r[0]}</td><td style="color:var(--muted)">${r[1]}</td><td>${r[2]}${r[3] ? ' <span class="mono" style="color:var(--accent-2);font-size:11px;">changed</span>' : ''}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  // Every check the generator actually ran, whether or not it changed
  // anything - "kept" and "not flagged" rows are shown just as prominently
  // as "swapped" and "flagged" ones, so nothing happens invisibly.
  function renderDecisionLog(variant) {
    const log = (variant.diff && variant.diff.decisionLog) || [];
    if (!log.length) return '';
    const outcomeColor = o => (o === 'kept' || o === 'not flagged' || o === 'no data yet') ? 'var(--muted)' : 'var(--accent-2)';
    let html = '<table class="data" style="margin-bottom:20px;table-layout:fixed;">';
    html += '<colgroup><col style="width:19%"><col style="width:23%"><col style="width:13%"><col style="width:45%"></colgroup>';
    html += '<thead><tr><th>Area checked</th><th>Metric used</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>';
    log.forEach(row => {
      html += `<tr><td>${row.area}</td><td style="color:var(--muted);font-size:12px;">${row.metric}</td><td class="mono" style="color:${outcomeColor(row.outcome)};font-size:11px;text-transform:uppercase;letter-spacing:.03em;">${row.outcome}</td><td style="font-size:12px;">${row.detail}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  function renderGenerated(variant, variantRate, prevBestRate, variantFluctuation) {
    const liftPts = Math.round((variantRate - prevBestRate) * 100);
    const bandPts = variantFluctuation ? Math.round(variantFluctuation.band * 100) : null;
    const liftReadout = bandPts !== null
      ? `${liftPts >= 0 ? '+' : ''}${liftPts} pts <span style="color:var(--muted);font-size:11px;">(typical run-to-run noise: &plusmn;${Math.round(bandPts / 2)} pts)</span>`
      : `${liftPts >= 0 ? '+' : ''}${liftPts} pts`;
    const liftIsNoise = bandPts !== null && Math.abs(liftPts) <= bandPts / 2;

    els.genPanel.innerHTML = `
      <div class="gen-frame-wrap"><iframe id="genFrame"></iframe></div>
      <h3 style="font-size:14px;color:var(--muted);margin-bottom:4px;">Every check this round, whether or not it changed anything</h3>
      <p style="font-size:12px;color:var(--muted);margin:-4px 0 14px;">Rows marked "kept" / "not flagged" mean the check ran and found the existing content already won - they're not skipped, just resolved in favor of what was already there.</p>
      ${renderDecisionLog(variant)}
      <h3 style="font-size:14px;color:var(--muted);margin:20px 0 4px;">Quick summary</h3>
      ${renderDiffTable(variant)}
      <table class="data">
        <tbody>
          <tr><td>Projected conversion (re-simulated on its own)</td><td class="num">${pct(variantRate)}%</td></tr>
          <tr><td>Previous best in pool</td><td class="num">${pct(prevBestRate)}%</td></tr>
          <tr><td>Lift</td><td class="num">${liftReadout}</td></tr>
        </tbody>
      </table>
      ${liftIsNoise ? `<p style="font-size:12px;color:var(--muted);margin-top:-8px;">This lift is within the typical noise band for this pool - treat it as "no clear change yet" rather than a real improvement, and consider running another generation before accepting.</p>` : ''}
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
        <div class="mono" style="color:var(--accent-2);font-size:10px;margin-top:4px;text-transform:uppercase;letter-spacing:.04em;">${h.changeType}</div>
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

    // 1b. also measure how much each page's conversion rate wobbles from
    // sampling randomness alone, by rerunning the same pool a few more
    // times. This is what lets "did it actually improve" be judged against
    // ordinary noise instead of a single lucky/unlucky run.
    const FLUCTUATION_REPLICATES = 5;
    const fluctuation = estimateFluctuation(pool, FLUCTUATION_REPLICATES, SESSIONS_PER_COMBO);
    totalSessions += FLUCTUATION_REPLICATES * pool.length * personas.length * SESSIONS_PER_COMBO;

    // 1c. Multi-visit model: separate from the main pipeline, doesn't feed
    // ranking or generation - purely an additional lens on the same pool.
    const VISITORS_PER_COMBO = 25;
    const visitors = window.WP.runMultiVisitSimulation(pool, personas, VISITORS_PER_COMBO, 3);
    const multiVisit = window.WP.analyzeMultiVisit(visitors, pool);
    totalSessions += visitors.reduce((s, v) => s + v.totalVisits, 0);

    // 1d. Headline isolation test: holds the winning page's body and CTA
    // fixed, swaps only the headline, to isolate that one variable.
    const HEADLINE_TEST_SESSIONS = 40;
    const headlineTest = window.WP.isolateHeadlineEffect(analysis, pool, personas, HEADLINE_TEST_SESSIONS);
    totalSessions += headlineTest.results.length * personas.length * HEADLINE_TEST_SESSIONS;

    renderBehavior(analysis, fluctuation, multiVisit, headlineTest);
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

    // Same idea as the pool-level fluctuation, but just for the chosen
    // variant, so the Lift figure can be read against its own noise band
    // rather than treated as an exact number.
    const VARIANT_REPLICATES = 3;
    const variantFluctuation = estimateFluctuation([variantToPageObject(variant)], VARIANT_REPLICATES, SESSIONS_PER_COMBO)[variant.id];
    totalSessions += VARIANT_REPLICATES * personas.length * SESSIONS_PER_COMBO;

    if (scored.length > 1) {
      variant.explanationHTML += ` <em>(${scored.length} candidate variants were generated this round - one from ${scored[0].variant.candidateSource}, one from ${scored[1].variant.candidateSource} - and simulated independently; this one performed better, at ${pct(chosen.rate)}% vs ${pct(scored[1].rate)}%.)</em>`;
    }

    renderGenerated(variant, variantRate, prevBest, variantFluctuation);

    history.push({
      generation, bestRate: Math.max(prevBest, variantRate), bestName: variantRate >= prevBest ? variant.name : analysis.ranked[0].name,
      changeType: variantRate >= prevBest
        ? (variant.diff.sectionSwap ? 'section swap'
          : variant.diff.ctaChange ? 'CTA swap'
          : (variant.diff.chipChecks || []).some(c => c.changed) ? 'chip reorder'
          : 'no real change - noise only')
        : 'change rejected'
    });
    renderHistory();

    els.sessionBadge.textContent = totalSessions.toLocaleString() + ' sessions of recon logged';
    els.genBadge.textContent = 'operation ' + generation;

    pendingVariant = variant;
    pendingVariantRate = variantRate;

    els.runBtn.disabled = false;
    els.acceptBtn.disabled = false;
    els.runBtn.textContent = 'Launch field test & generate next operation';
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
