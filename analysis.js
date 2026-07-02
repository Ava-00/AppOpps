// Aggregates raw simulated sessions into the numbers the dashboard shows,
// and the numbers the generator uses to decide what to build next.
window.WP = window.WP || {};

window.WP.analyzeSessions = function (sessions, pages) {
  const byPage = pages.map(page => {
    const pageSessions = sessions.filter(s => s.pageId === page.id);
    const n = pageSessions.length;
    const clicks = pageSessions.filter(s => s.clicked).length;
    const bounces = pageSessions.filter(s => s.bounced).length;
    const avgScrollDepth = pageSessions.reduce((s, r) => s + r.scrollDepthPct, 0) / n;
    const avgDwell = pageSessions.reduce((s, r) => s + r.totalDwell, 0) / n;

    // per-section stats within this page
    const sectionStats = page.sections.map(section => {
      const rows = pageSessions
        .map(s => s.sectionResults.find(r => r.sectionId === section.id))
        .filter(Boolean);
      const seen = rows.length;
      const avgDwellSec = rows.reduce((s, r) => s + r.dwell, 0) / (seen || 1);
      const avgAffinity = rows.reduce((s, r) => s + r.affinity, 0) / (seen || 1);
      return {
        sectionId: section.id, role: section.role, label: section.label, tags: section.tags,
        reachRate: seen / n, avgDwell: avgDwellSec, avgAffinity
      };
    });

    return {
      pageId: page.id, name: page.name, angle: page.angle, messageTag: page.messageTag,
      headline: page.headline, ctaCopy: page.ctaCopy,
      n, conversionRate: clicks / n, bounceRate: bounces / n,
      avgScrollDepth, avgDwell, sectionStats
    };
  });

  const ranked = [...byPage].sort((a, b) => b.conversionRate - a.conversionRate);

  // persona x page conversion matrix, for surfacing cross-over insights
  const personaPageMatrix = {};
  sessions.forEach(s => {
    const key = s.personaId + '|' + s.pageId;
    if (!personaPageMatrix[key]) personaPageMatrix[key] = { clicks: 0, n: 0 };
    personaPageMatrix[key].n++;
    if (s.clicked) personaPageMatrix[key].clicks++;
  });

  // flatten every section across every page, for finding the single "stickiest" section overall
  const allSections = [];
  byPage.forEach(p => {
    p.sectionStats.forEach(sec => {
      allSections.push({ pageId: p.pageId, pageName: p.name, ...sec });
    });
  });
  const stickiestSection = [...allSections].sort((a, b) => (b.avgDwell * b.avgAffinity) - (a.avgDwell * a.avgAffinity))[0];

  const bestCTA = [...byPage].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return { byPage, ranked, personaPageMatrix, allSections, stickiestSection, bestCTA };
};

// Finds, for a given persona, which page converted best - used to surface
// "unexpected winner" callouts in the dashboard copy.
window.WP.bestPageForPersona = function (personaId, pages, personaPageMatrix) {
  let best = null;
  pages.forEach(p => {
    const rec = personaPageMatrix[personaId + '|' + p.id];
    if (!rec) return;
    const rate = rec.clicks / rec.n;
    if (!best || rate > best.rate) best = { pageId: p.id, pageName: p.name, rate };
  });
  return best;
};
