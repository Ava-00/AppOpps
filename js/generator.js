// Builds a new landing page variant purely from the aggregated numbers -
// no external model call. The mechanism: take the page that converted best,
// find its single weakest section (lowest dwell x affinity), and replace
// just that section with the best-performing comparable section found
// anywhere else in the test - keeping page length constant so the swap
// doesn't introduce new bounce risk. Then keep (or upgrade) the CTA copy,
// weighted toward staying coherent with the winning headline's tone.
window.WP = window.WP || {};

function pct(n) { return Math.round(n * 100); }
function score(s) { return s.avgDwell * s.avgAffinity; }

function buildExplanation(winner, runnerUp, swap, ctaPage, ctaIsNew, analysis) {
  const parts = [];
  parts.push(
    `<strong>${winner.name}</strong> converted best at <span class="num">${pct(winner.conversionRate)}%</span>` +
    (runnerUp ? `, ahead of ${runnerUp.name} at <span class="num">${pct(runnerUp.conversionRate)}%</span>.` : '.') +
    ` Its headline ("${winner.headline}") carries over unchanged, since it drove the strongest overall click-through.`
  );

  if (swap) {
    parts.push(
      `Within that page, the <strong>${swap.weakest.label}</strong> section was the weakest link - only ` +
      `<span class="num">${Math.round(swap.weakest.avgDwell)}s</span> average dwell at <span class="num">${Math.round(swap.weakest.avgAffinity * 100)}%</span> affinity match. ` +
      `It's replaced here with the <strong>${swap.best.label}</strong> section from ${swap.best.sourcePageName}, which held attention for ` +
      `<span class="num">${Math.round(swap.best.avgDwell)}s</span> at <span class="num">${Math.round(swap.best.avgAffinity * 100)}%</span> affinity - the strongest comparable section found anywhere in the test. ` +
      `Total section count stays the same as the original, so this doesn't add a new place for visitors to drop off.`
    );
  } else {
    parts.push(`No section in the test beat what this page already had in that slot, so the body content carries over unchanged.`);
  }

  if (ctaIsNew) {
    parts.push(
      `The call to action was swapped to ${ctaPage.name}'s phrasing ("${ctaPage.ctaCopy}"), which converted meaningfully better than the winning page's own CTA once visitors reached it, while still staying on-tone.`
    );
  } else {
    parts.push(`The CTA itself is unchanged - the winning page's own phrasing ("${ctaPage.ctaCopy}") was already the strongest available option for this headline's tone.`);
  }

  const sticky = analysis.stickiestSection;
  if (sticky) {
    parts.push(
      `For reference, the single stickiest moment across the whole test was the <strong>${sticky.label}</strong> section on ${sticky.pageName}, at <span class="num">${Math.round(sticky.avgDwell)}s</span> average dwell - worth testing as the next swap target if this generation's change under-performs.`
    );
  }

  return parts.join(' ');
}

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

  // Weight external candidates by raw performance AND by how well their own
  // tags overlap with the winning page's audience - a section that scored
  // well on average but shares nothing with this page's message can still
  // tank continuation for this page's actual persona, so it's discounted
  // rather than picked purely on raw dwell x affinity.
  const externalCandidates = analysis.allSections
    .filter(s => s.pageId !== winner.pageId && s.role !== 'hero' && s.role !== 'cta')
    .map(s => ({ ...s, coherence: (s.tags && s.tags[heroPage.messageTag]) || 0 }))
    .sort((a, b) => score(b) * (0.4 + b.coherence) - score(a) * (0.4 + a.coherence));
  const bestExternal = externalCandidates[0];

  let swap = null;
  let newMiddleSections;

  if (weakestOwn && bestExternal && score(bestExternal) * (0.4 + bestExternal.coherence) > score(weakestOwn)) {
    const extPage = pages.find(p => p.id === bestExternal.pageId);
    const extSectionCfg = extPage.sections.find(s => s.id === bestExternal.sectionId);
    swap = { weakest: weakestOwn, best: { ...bestExternal, sourcePageName: extPage.name } };
    newMiddleSections = winnerMiddleSections.map(s =>
      s.id === weakestOwn.sectionId
        ? { id: extSectionCfg.id + '_' + extPage.id, role: extSectionCfg.role, label: extSectionCfg.label, tags: extSectionCfg.tags, bodyHTML: extSectionCfg.bodyHTML }
        : { ...s }
    );
  } else {
    newMiddleSections = winnerMiddleSections.map(s => ({ ...s }));
  }

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

  const explanationHTML = buildExplanation(winner, runnerUp, swap, ctaPage, ctaIsNew, analysis);

  const syntheticSections = [
    { id: 'hero', role: 'hero', label: 'Hero', tags: heroSection.tags, bodyHTML: heroSection.bodyHTML },
    ...newMiddleSections,
    { id: 'cta', role: 'cta', label: 'CTA', tags: ctaSectionCfg.tags }
  ];

  return {
    id: 'GEN' + generationNumber + '_' + sourceIndex,
    name: `Operation ${generationNumber}`,
    candidateSource: winner.name,
    angle: swap ? `${winner.name}, with ${swap.weakest.label} swapped for a stronger section` : `${winner.name}, orders refined`,
    messageTag: heroPage.messageTag,
    headline: heroPage.headline,
    ctaCopy: ctaPage.ctaCopy,
    sections: syntheticSections,
    explanationHTML,
    sourceWinner: winner.name,
    sourceCta: ctaPage.name,
    swap
  };
};
