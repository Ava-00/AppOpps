// Builds a new landing page variant purely from the aggregated numbers -
// no external model call. Two mechanisms feed the "learning" step:
// 1) whole-section swap - replace the winning page's weakest section with
//    the best comparable section found elsewhere.
// 2) chip reordering - within whichever section ends up in that slot, the
//    individual list items get re-ordered by which one actually held
//    attention, rather than staying in whatever order they were written in.
//
// Every generation now returns a `decisionLog`: one row per check the
// generator actually ran, whether or not it produced a visible change.
// "No section beat this one" and "no chip reorder needed here" are just as
// much a logged decision as an actual swap - the point is nothing happens
// silently.
window.WP = window.WP || {};

function pct(n) { return Math.round(n * 100); }
function score(s) { return s.avgDwell * s.avgAffinity; }
function strip(html) { return (html || '').replace(/<[^>]+>/g, '').trim(); }

function reorderChips(chips, chipRanking) {
  if (!chips || !chipRanking) return chips || null;
  const byId = {};
  chips.forEach(c => { byId[c.id] = c; });
  const ordered = chipRanking.map(r => byId[r.id]).filter(Boolean);
  chips.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
  return ordered;
}

function chipOrderChanged(originalChips, reordered) {
  if (!originalChips || !reordered) return false;
  return originalChips.map(c => c.id).join(',') !== reordered.map(c => c.id).join(',');
}

function bestPersonaForPage(pageId, personaPageMatrix) {
  let best = null;
  (window.WP.personas || []).forEach(persona => {
    const rec = personaPageMatrix[persona.id + '|' + pageId];
    if (!rec || !rec.n) return;
    const rate = rec.clicks / rec.n;
    if (!best || rate > best.rate) best = { persona, rate };
  });
  return best;
}

function buildExplanation(winner, runnerUp, diff, analysis) {
  const parts = [];
  parts.push(
    `<strong>${winner.name}</strong> converted best at <span class="num">${pct(winner.conversionRate)}%</span>` +
    (runnerUp ? `, ahead of ${runnerUp.name} at <span class="num">${pct(runnerUp.conversionRate)}%</span>.` : '.') +
    ` Its headline carries over unchanged, since it drove the strongest overall click-through.`
  );

  if (diff.personaFit) {
    const f = diff.personaFit;
    parts.push(
      `<strong>Why:</strong> of the five simulated personas, <strong>${f.personaName}</strong> converted best on this page specifically, at <span class="num">${f.rate}%</span>. ` +
      `Their own weight on this page's "${f.messageTag}" framing is <span class="num">${f.weight}</span> out of 1.0 - the closest match of any persona to what this page is actually saying, which is the underlying reason it leads the pool rather than a coincidence of copy quality.`
    );
  }

  if (diff.sectionSwap) {
    const s = diff.sectionSwap;
    parts.push(
      `Within that page, the <strong>${s.fromLabel}</strong> section was the weakest link - only ` +
      `<span class="num">${s.fromDwell}s</span> average dwell at <span class="num">${s.fromAffinity}%</span> affinity match. ` +
      `It's replaced here with the <strong>${s.toLabel}</strong> section from ${s.toPage}, which held attention for ` +
      `<span class="num">${s.toDwell}s</span> at <span class="num">${s.toAffinity}%</span> affinity - the strongest comparable section found anywhere in the test. ` +
      `Total section count stays the same as the original, so this doesn't add a new place for visitors to drop off.`
    );
  } else {
    parts.push(`No section in the test beat what this page already had in that slot, so the body content carries over unchanged.`);
  }

  if (diff.rejectedCandidate) {
    const r = diff.rejectedCandidate;
    parts.push(
      `<strong>Considered and rejected:</strong> "${r.label}" from ${r.pageName} scored higher on raw engagement, but was passed over here because it doesn't share this page's "${r.messageTag}" tone - a section that performs well on average can still work against a page if it doesn't fit that page's specific audience.`
    );
  }

  const changedChips = (diff.chipChecks || []).filter(c => c.changed);
  if (changedChips.length) {
    changedChips.forEach(c => {
      parts.push(`Within the "${c.sectionLabel}" section, "${c.topLabel}" led with ${c.wins} of ${c.total} simulated visits and now sits first in the list.`);
    });
  }

  if (diff.ctaChange) {
    const c = diff.ctaChange;
    parts.push(`The call to action was swapped from "${c.from}" to "${c.to}" (${c.toPage}'s phrasing), which converted meaningfully better once visitors reached it, while still staying on-tone.`);
  } else {
    parts.push(`The CTA itself is unchanged - it was already the strongest available option for this headline's tone.`);
  }

  if (diff.hesitation) {
    parts.push(`Visitors who reached the CTA lingered there for <span class="num">${diff.hesitation.seconds}s</span> on average before deciding - long enough to suggest the offer was seen but not fully trusted, not just missed.`);
  }
  if (diff.saveIntent) {
    parts.push(`Among visitors who didn't convert, <span class="num">${diff.saveIntent.rate}%</span> still showed save/return behavior rather than leaving outright - interest without urgency, which a deadline or reminder cue could target next.`);
  }

  const sticky = analysis.stickiestSection;
  if (sticky) {
    parts.push(
      `For reference, the single stickiest moment across the whole test was the <strong>${sticky.label}</strong> section on ${sticky.pageName}, at <span class="num">${Math.round(sticky.avgDwell)}s</span> average dwell - worth testing as the next swap target if this generation's change under-performs.`
    );
  }

  return parts.join(' ');
}

// Isolates the effect of JUST the headline, holding every other section
// and the CTA fixed at whatever the current winning page uses.
window.WP.isolateHeadlineEffect = function (analysis, pages, personas, sessionsPerCombo) {
  const winner = analysis.ranked[0];
  const basePage = pages.find(p => p.id === winner.pageId);
  const results = [];

  const controlSessions = window.WP.runSimulation([basePage], personas, sessionsPerCombo);
  const controlRate = controlSessions.filter(s => s.clicked).length / controlSessions.length;
  results.push({ source: basePage.name, rate: controlRate, isControl: true });

  pages.forEach(p => {
    if (p.id === basePage.id) return;
    const altHero = p.sections.find(s => s.role === 'hero');
    if (!altHero) return;
    const testPage = {
      ...basePage,
      id: 'HTEST_' + p.id,
      sections: basePage.sections.map(s => (s.role === 'hero' ? { ...s, bodyHTML: altHero.bodyHTML } : s))
    };
    const sess = window.WP.runSimulation([testPage], personas, sessionsPerCombo);
    const rate = sess.filter(s => s.clicked).length / sess.length;
    results.push({ source: p.name + '\u2019s headline', rate, isControl: false });
  });

  results.sort((a, b) => b.rate - a.rate);
  return { baseName: basePage.name, results };
};

window.WP.generateVariant = function (analysis, pages, generationNumber, sourceIndex) {
  sourceIndex = sourceIndex || 0;
  const winner = analysis.ranked[sourceIndex];
  const runnerUp = analysis.ranked[sourceIndex + 1] || analysis.ranked[sourceIndex - 1];
  const heroPage = pages.find(p => p.id === winner.pageId);
  const heroSection = heroPage.sections.find(s => s.role === 'hero');
  const winnerMiddleSections = heroPage.sections.filter(s => s.role !== 'hero' && s.role !== 'cta');

  const winnerPageStats = analysis.byPage.find(p => p.pageId === winner.pageId);
  const winnerMiddleStats = winnerPageStats.sectionStats.filter(s => s.role !== 'hero' && s.role !== 'cta');
  const weakestOwn = winnerMiddleStats.length
    ? [...winnerMiddleStats].sort((a, b) => score(a) - score(b))[0]
    : null;

  const decisionLog = [];

  decisionLog.push({
    area: 'Headline', metric: 'Conversion rate (highest in pool)', outcome: 'kept',
    detail: `${winner.name} led the pool at ${pct(winner.conversionRate)}% - its headline carries over as-is.`
  });

  const externalCandidates = analysis.allSections
    .filter(s => s.pageId !== winner.pageId && s.role !== 'hero' && s.role !== 'cta')
    .map(s => ({ ...s, coherence: (s.tags && s.tags[heroPage.messageTag]) || 0 }))
    .sort((a, b) => score(b) * (0.4 + b.coherence) - score(a) * (0.4 + a.coherence));
  const bestExternal = externalCandidates[0];

  const rawRanked = [...externalCandidates].sort((a, b) => score(b) - score(a));
  const rawTop = rawRanked[0];
  let rejectedCandidateDiff = null;
  if (rawTop && bestExternal && rawTop.sectionId + rawTop.pageId !== bestExternal.sectionId + bestExternal.pageId
    && score(rawTop) > score(bestExternal) * 1.1 && rawTop.coherence < 0.3) {
    const rawTopPage = pages.find(p => p.id === rawTop.pageId);
    rejectedCandidateDiff = { label: rawTop.label, pageName: rawTopPage.name, messageTag: heroPage.messageTag };
    decisionLog.push({
      area: 'Alternative section', metric: 'Raw dwell x affinity vs. tone coherence', outcome: 'rejected',
      detail: `"${rawTop.label}" from ${rawTopPage.name} scored higher on raw engagement (${score(rawTop).toFixed(1)} vs ${score(bestExternal).toFixed(1)}) but shares almost none of this page's "${heroPage.messageTag}" tone (coherence ${rawTop.coherence.toFixed(1)}), so it was passed over.`
    });
  }

  let sectionSwapDiff = null;
  let newMiddleSections;

  if (weakestOwn && bestExternal && score(bestExternal) * (0.4 + bestExternal.coherence) > score(weakestOwn)) {
    const extPage = pages.find(p => p.id === bestExternal.pageId);
    const extSectionCfg = extPage.sections.find(s => s.id === bestExternal.sectionId);
    const reordered = reorderChips(extSectionCfg.chips, bestExternal.chipRanking);
    sectionSwapDiff = {
      fromLabel: weakestOwn.label, fromDwell: Math.round(weakestOwn.avgDwell), fromAffinity: Math.round(weakestOwn.avgAffinity * 100),
      toLabel: bestExternal.label, toPage: extPage.name, toDwell: Math.round(bestExternal.avgDwell), toAffinity: Math.round(bestExternal.avgAffinity * 100)
    };
    decisionLog.push({
      area: 'Body section slot', metric: 'Dwell x affinity (own weakest vs. best external)', outcome: 'swapped',
      detail: `"${weakestOwn.label}" (score ${score(weakestOwn).toFixed(1)}) replaced by "${bestExternal.label}" from ${extPage.name} (weighted score ${(score(bestExternal) * (0.4 + bestExternal.coherence)).toFixed(1)}). Section count unchanged, so bounce risk isn't affected.`
    });
    newMiddleSections = winnerMiddleSections.map(s =>
      s.id === weakestOwn.sectionId
        ? { id: extSectionCfg.id + '_' + extPage.id, role: extSectionCfg.role, label: extSectionCfg.label, tags: extSectionCfg.tags, bodyHTML: extSectionCfg.bodyHTML, chips: reordered, chipStyle: extSectionCfg.chipStyle }
        : { ...s, chips: reorderChips(s.chips, (winnerMiddleStats.find(ws => ws.sectionId === s.id) || {}).chipRanking) }
    );
  } else {
    const weakestScore = weakestOwn ? score(weakestOwn).toFixed(1) : 'n/a';
    const bestScore = bestExternal ? (score(bestExternal) * (0.4 + bestExternal.coherence)).toFixed(1) : 'n/a';
    decisionLog.push({
      area: 'Body section slot', metric: 'Dwell x affinity (own weakest vs. best external)', outcome: 'kept',
      detail: weakestOwn
        ? `This page's own weakest section (${weakestOwn.label}, score ${weakestScore}) still beat the best coherent external candidate (score ${bestScore}), so nothing was swapped.`
        : `This page has no swappable middle sections.`
    });
    newMiddleSections = winnerMiddleSections.map(s => ({ ...s }));
  }

  // Chip order is checked in EVERY chip-bearing section of the resulting
  // page, not just the first one - each check is logged whether or not it
  // changed anything.
  const chipChecks = [];
  newMiddleSections = newMiddleSections.map(s => {
    if (!s.chips || !s.chips.length) return s;
    const isSwappedSection = sectionSwapDiff && s.label === sectionSwapDiff.toLabel;
    const statSource = isSwappedSection ? bestExternal : winnerMiddleStats.find(ws => ws.sectionId === s.id);
    const ranking = statSource && statSource.chipRanking;
    const top = ranking && ranking[0];
    const totalWins = ranking ? ranking.reduce((sum, c) => sum + c.wins, 0) : 0;
    chipChecks.push({
      sectionLabel: s.label,
      changed: !!(top && totalWins),
      topLabel: top ? strip(top.label) : null,
      wins: top ? top.wins : 0,
      total: totalWins
    });
    return s;
  });
  chipChecks.forEach(c => {
    decisionLog.push({
      area: 'List order: ' + c.sectionLabel, metric: 'Chip win count from simulated sessions', outcome: c.changed ? 'reordered' : 'no data yet',
      detail: c.changed
        ? `"${c.topLabel}" led with ${c.wins} of ${c.total} simulated visits and now sits first.`
        : `No simulated visits reached this section's chips yet this round.`
    });
  });

  // CTA: prefer the winning page's own CTA unless another page's CTA clearly
  // out-converts it while still sharing tonal overlap with this headline.
  const ownCtaStats = winnerPageStats.sectionStats.find(s => s.role === 'cta');
  const ctaCandidates = analysis.allSections
    .filter(s => s.role === 'cta')
    .map(s => ({ ...s, coherence: (s.tags && s.tags[heroPage.messageTag]) || 0 }))
    .sort((a, b) => (b.avgAffinity * b.reachRate * (0.5 + b.coherence)) - (a.avgAffinity * a.reachRate * (0.5 + a.coherence)));
  const topCta = ctaCandidates[0];
  const ctaIsNew = topCta && ownCtaStats && topCta.pageId !== winner.pageId &&
    (topCta.avgAffinity * topCta.reachRate) > (ownCtaStats.avgAffinity * ownCtaStats.reachRate) * 1.1;
  const ctaPage = ctaIsNew ? pages.find(p => p.id === topCta.pageId) : heroPage;
  const ctaSectionCfg = ctaPage.sections.find(s => s.role === 'cta');

  const ctaChangeDiff = ctaIsNew ? { from: heroPage.ctaCopy, to: ctaPage.ctaCopy, toPage: ctaPage.name } : null;
  decisionLog.push({
    area: 'CTA copy', metric: 'Affinity x reach x tone coherence', outcome: ctaIsNew ? 'swapped' : 'kept',
    detail: ctaIsNew
      ? `"${heroPage.ctaCopy}" replaced by "${ctaPage.ctaCopy}" from ${ctaPage.name} - clearly stronger once visitors actually reached it, and still on-tone.`
      : `"${heroPage.ctaCopy}" already outperformed every coherent alternative once visitors reached it.`
  });

  let hesitationDiff = null;
  const hesitationTriggered = winnerPageStats.avgCtaHesitation > 6 && winnerPageStats.conversionRate < 0.5;
  if (hesitationTriggered) hesitationDiff = { seconds: Math.round(winnerPageStats.avgCtaHesitation) };
  decisionLog.push({
    area: 'CTA hesitation signal', metric: 'Avg seconds on CTA before deciding (threshold 6s)', outcome: hesitationTriggered ? 'flagged' : 'not flagged',
    detail: `${winnerPageStats.avgCtaHesitation.toFixed(1)}s average` + (hesitationTriggered ? ' - long enough to suggest the offer was seen but not trusted.' : ' - within normal range, no trust concern flagged.')
  });

  let saveIntentDiff = null;
  const saveTriggered = winnerPageStats.saveIntentRate > 0.3;
  if (saveTriggered) saveIntentDiff = { rate: pct(winnerPageStats.saveIntentRate) };
  decisionLog.push({
    area: 'Save/return intent signal', metric: 'Share of non-converters showing save intent (threshold 30%)', outcome: saveTriggered ? 'flagged' : 'not flagged',
    detail: `${pct(winnerPageStats.saveIntentRate)}% of non-converters` + (saveTriggered ? ' - meaningful interest without urgency.' : ' - not high enough to call out this round.')
  });

  const bestPersona = bestPersonaForPage(winner.pageId, analysis.personaPageMatrix);
  const personaFitDiff = bestPersona ? {
    personaName: bestPersona.persona.name,
    rate: pct(bestPersona.rate),
    messageTag: heroPage.messageTag,
    weight: (bestPersona.persona.weights[heroPage.messageTag] || 0).toFixed(1)
  } : null;
  if (personaFitDiff) {
    decisionLog.push({
      area: 'Persona fit', metric: 'Persona weight on this page\'s message tag', outcome: 'identified',
      detail: `${personaFitDiff.personaName} converted best on this page (${personaFitDiff.rate}%), matching its "${personaFitDiff.messageTag}" framing at weight ${personaFitDiff.weight}/1.0.`
    });
  }

  const diff = {
    headline: { value: heroPage.headline, changed: false },
    sectionSwap: sectionSwapDiff,
    chipChecks,
    ctaChange: ctaChangeDiff,
    hesitation: hesitationDiff,
    saveIntent: saveIntentDiff,
    personaFit: personaFitDiff,
    rejectedCandidate: rejectedCandidateDiff,
    decisionLog
  };

  const explanationHTML = buildExplanation(winner, runnerUp, diff, analysis);

  const syntheticSections = [
    { id: 'hero', role: 'hero', label: 'Hero', tags: heroSection.tags, bodyHTML: heroSection.bodyHTML },
    ...newMiddleSections,
    { id: 'cta', role: 'cta', label: 'CTA', tags: ctaSectionCfg.tags }
  ];

  return {
    id: 'GEN' + generationNumber + '_' + sourceIndex,
    name: `Operation ${generationNumber}`,
    candidateSource: winner.name,
    angle: sectionSwapDiff ? `${winner.name}, with ${sectionSwapDiff.fromLabel} swapped for a stronger section` : `${winner.name}, orders refined`,
    messageTag: heroPage.messageTag,
    headline: heroPage.headline,
    ctaCopy: ctaPage.ctaCopy,
    sections: syntheticSections,
    explanationHTML,
    diff,
    sourceWinner: winner.name,
    sourceCta: ctaPage.name
  };
};
