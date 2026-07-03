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

    const hesitationRows = pageSessions.filter(s => s.ctaHesitation !== null);
    const avgCtaHesitation = hesitationRows.length
      ? hesitationRows.reduce((s, r) => s + r.ctaHesitation, 0) / hesitationRows.length
      : 0;

    const nonConverted = pageSessions.filter(s => !s.clicked);
    const saveIntentRate = nonConverted.length
      ? nonConverted.filter(s => s.saveIntent).length / nonConverted.length
      : 0;

    // where visitors who bounced actually quit - a concentrated drop-off
    // point tells a different story than bounces spread evenly across
    // every section
    const bounceCounts = {};
    pageSessions.filter(s => s.bounced).forEach(s => {
      bounceCounts[s.bounceAtSection] = (bounceCounts[s.bounceAtSection] || 0) + 1;
    });
    const bounceBreakdown = Object.entries(bounceCounts)
      .map(([sectionId, count]) => {
        const sec = page.sections.find(x => x.id === sectionId);
        return { sectionId, label: sec ? sec.label : sectionId, count, share: count / (bounces || 1) };
      })
      .sort((a, b) => b.count - a.count);

    // per-section stats within this page, including chip-level rankings for
    // sections that carry a chip list, and skip/skim/read engagement mix
    const sectionStats = page.sections.map(section => {
      const rows = pageSessions
        .map(s => s.sectionResults.find(r => r.sectionId === section.id))
        .filter(Boolean);
      const seen = rows.length;
      const avgDwellSec = rows.reduce((s, r) => s + r.dwell, 0) / (seen || 1);
      const avgAffinity = rows.reduce((s, r) => s + r.affinity, 0) / (seen || 1);

      const engagementCounts = { skip: 0, skim: 0, read: 0 };
      rows.forEach(r => { if (engagementCounts[r.engagement] !== undefined) engagementCounts[r.engagement]++; });

      let chipRanking = null;
      if (section.chips && section.chips.length) {
        const winCounts = {};
        section.chips.forEach(c => { winCounts[c.id] = 0; });
        pageSessions.forEach(s => {
          s.chipWins.forEach(w => {
            if (w.sectionId === section.id && winCounts[w.chipId] !== undefined) winCounts[w.chipId]++;
          });
        });
        chipRanking = section.chips
          .map(c => ({ id: c.id, stat: c.stat, label: c.label, wins: winCounts[c.id] }))
          .sort((a, b) => b.wins - a.wins);
      }

      return {
        sectionId: section.id, role: section.role, label: section.label, tags: section.tags,
        reachRate: seen / n, avgDwell: avgDwellSec, avgAffinity, chipRanking,
        engagement: {
          skipPct: seen ? engagementCounts.skip / seen : 0,
          skimPct: seen ? engagementCounts.skim / seen : 0,
          readPct: seen ? engagementCounts.read / seen : 0
        }
      };
    });

    // page-level rollup of the same skip/skim/read mix, averaged across
    // every section visit on this page (not just one section)
    const allVisits = pageSessions.flatMap(s => s.sectionResults);
    const engagementTotals = { skip: 0, skim: 0, read: 0 };
    allVisits.forEach(v => { if (engagementTotals[v.engagement] !== undefined) engagementTotals[v.engagement]++; });
    const totalVisits = allVisits.length || 1;
    const engagementMix = {
      skipPct: engagementTotals.skip / totalVisits,
      skimPct: engagementTotals.skim / totalVisits,
      readPct: engagementTotals.read / totalVisits
    };

    return {
      pageId: page.id, name: page.name, angle: page.angle, messageTag: page.messageTag,
      headline: page.headline, ctaCopy: page.ctaCopy,
      n, conversionRate: clicks / n, bounceRate: bounces / n,
      avgScrollDepth, avgDwell, avgCtaHesitation, saveIntentRate, bounceBreakdown, engagementMix, sectionStats
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

  // highest-hesitation page - highest average CTA dwell relative to its own
  // conversion rate, a proxy for "seen but not trusted"
  const mostHesitant = [...byPage]
    .filter(p => p.avgCtaHesitation > 0)
    .sort((a, b) => (b.avgCtaHesitation * (1 - b.conversionRate)) - (a.avgCtaHesitation * (1 - a.conversionRate)))[0];

  return { byPage, ranked, personaPageMatrix, allSections, stickiestSection, bestCTA, mostHesitant };
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

// Aggregates multi-visit visitor records into per-page comparisons of
// first-visit-only conversion vs. conversion allowed up to maxVisits, plus
// how many visits it typically took converters to actually convert.
window.WP.analyzeMultiVisit = function (visitors, pages) {
  return pages.map(page => {
    const pageVisitors = visitors.filter(v => v.pageId === page.id);
    const n = pageVisitors.length;
    const firstVisitConverted = pageVisitors.filter(v => v.visits[0] && v.visits[0].clicked).length;
    const everConverted = pageVisitors.filter(v => v.converted).length;
    const returners = pageVisitors.filter(v => v.totalVisits > 1).length;
    const converters = pageVisitors.filter(v => v.converted);
    const avgVisitsToConvert = converters.length
      ? converters.reduce((s, v) => s + v.totalVisits, 0) / converters.length
      : 0;
    return {
      pageId: page.id, name: page.name, n,
      firstVisitRate: n ? firstVisitConverted / n : 0,
      multiVisitRate: n ? everConverted / n : 0,
      returnRate: n ? returners / n : 0,
      avgVisitsToConvert
    };
  });
};

// Ranks the tracked metrics by how much they actually vary across the
// current pool of pages, relative to each metric's own scale. The metric
// with the largest relative spread is the one actually distinguishing
// pages from each other this round - a metric where every page scores
// about the same isn't what's driving the ranking, however important it
// sounds in principle.
window.WP.computeMetricInfluence = function (byPage) {
  const metrics = [
    { key: 'conversionRate', label: 'Conversion rate', fmt: v => Math.round(v * 100) + '%' },
    { key: 'avgScrollDepth', label: 'Scroll depth', fmt: v => Math.round(v) + '%' },
    { key: 'avgCtaHesitation', label: 'CTA hesitation', fmt: v => v.toFixed(1) + 's' },
    { key: 'saveIntentRate', label: 'Save intent', fmt: v => Math.round(v * 100) + '%' },
    { key: 'avgDwell', label: 'Total dwell', fmt: v => Math.round(v) + 's' }
  ];
  return metrics.map(m => {
    const vals = byPage.map(p => p[m.key]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const spread = mean > 0 ? (max - min) / mean : 0;
    return { ...m, min, max, mean, spread };
  }).sort((a, b) => b.spread - a.spread);
};
