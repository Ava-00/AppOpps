// Simulates user sessions across every persona x page combination.
// No real users, no external data - purely persona-weighted randomness,
// but the weighting logic is what makes the "learning" step meaningful.
window.WP = window.WP || {};

function jitter(min, max) {
  return min + Math.random() * (max - min);
}

window.WP.stripHTML = function (html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Word count per section, memoized onto the section object itself so it's
// only computed once even across many simulated sessions.
function sectionWordCount(section) {
  if (section._words !== undefined) return section._words;
  let words = window.WP.stripHTML(section.bodyHTML).split(' ').filter(Boolean).length;
  if (section.chips) {
    section.chips.forEach(c => { words += window.WP.stripHTML(c.label).split(' ').filter(Boolean).length; });
  }
  section._words = words;
  return words;
}

// Skip / skim / read, based on dwell time relative to how long the section
// would actually take to read at a normal pace (~2.85 words/sec). This is
// a different signal than raw dwell seconds - a 9-second dwell on a
// 60-word section is a skim, but the same 9 seconds on a 15-word section
// is a full read with time to spare.
function classifyEngagement(dwellSec, words) {
  const expectedRead = Math.max(1, words * 0.35);
  const ratio = dwellSec / expectedRead;
  if (dwellSec < 2 || ratio < 0.2) return 'skip';
  if (ratio < 0.75) return 'skim';
  return 'read';
}

// Weighted average affinity of a section for a given persona, normalized 0-1.
function sectionAffinity(section, personaWeights) {
  const entries = Object.entries(section.tags);
  let sum = 0, weightTotal = 0;
  entries.forEach(([tag, weight]) => {
    const pw = personaWeights[tag] !== undefined ? personaWeights[tag] : 0.3;
    sum += pw * weight;
    weightTotal += weight;
  });
  return weightTotal > 0 ? Math.min(1, sum / weightTotal) : 0.3;
}

// Within a section that lists several chips (feature grid, FAQ items,
// privacy assurances), picks which single chip held the most simulated
// attention this session. Earlier chips get a small primacy edge (typical
// reading behavior), overlaid with random noise scaled by the section's
// overall affinity - a chip in a section the visitor barely cares about
// still gets a noisy, low-signal pick, which is intentional.
function pickWinningChip(chips, affinity) {
  if (!chips || !chips.length) return null;
  let best = null, bestScore = -Infinity;
  chips.forEach((chip, i) => {
    const primacy = 1 - i * 0.1;
    const weight = chip.weight || 1;
    const score = primacy * (0.5 + affinity) * weight + jitter(-0.4, 0.4);
    if (score > bestScore) { bestScore = score; best = chip; }
  });
  return best.id;
}

// familiarity (0-1ish) represents "has seen this page before" - used only
// by the multi-visit simulator below. It nudges continuation and click
// probability up a little each return visit, and defaults to 0 (no
// effect), so ordinary single-visit simulation is unchanged.
function simulateSession(persona, page, familiarity) {
  familiarity = familiarity || 0;
  const sectionResults = [];
  const chipWins = []; // { sectionId, chipId }
  let bounced = false;
  let bounceAtSection = null;
  let reachedCTA = false;

  for (let i = 0; i < page.sections.length; i++) {
    const section = page.sections[i];
    const affinity = sectionAffinity(section, persona.weights);
    const baseDwell = window.WP.baseDwellByRole[section.role] || 6;
    const dwell = Math.round(baseDwell * (0.4 + affinity * 1.3) * jitter(0.8, 1.2));
    const words = sectionWordCount(section);
    const engagement = classifyEngagement(dwell, words);

    sectionResults.push({ sectionId: section.id, role: section.role, label: section.label, dwell, affinity: +affinity.toFixed(2), words, engagement });

    if (section.chips && section.chips.length) {
      const winId = pickWinningChip(section.chips, affinity);
      if (winId) chipWins.push({ sectionId: section.id, chipId: winId });
    }

    const isLast = i === page.sections.length - 1;
    if (!isLast) {
      const continueProb = Math.min(0.97, 0.3 + affinity * 0.45 * (0.6 + persona.scrollPatience) + persona.scrollPatience * 0.15 + familiarity * 0.1);
      if (Math.random() > continueProb) {
        bounced = true;
        bounceAtSection = section.id;
        break;
      }
    } else if (section.role === 'cta') {
      reachedCTA = true;
    }
  }

  let clicked = false;
  let ctaHesitation = null;
  if (reachedCTA) {
    const ctaSection = page.sections[page.sections.length - 1];
    const ctaAffinity = sectionAffinity(ctaSection, persona.weights);
    const clickProb = Math.min(0.95, 0.05 + 0.75 * ctaAffinity * persona.ctaSensitivity + familiarity * 0.15);
    clicked = Math.random() < clickProb;
    ctaHesitation = sectionResults[sectionResults.length - 1].dwell;
  }

  // Save/return intent: only meaningful for visitors who did NOT convert.
  // Modeled as more likely for low-friction-leaning personas, and boosted
  // slightly on pages whose own message is low-friction (a "save for later"
  // page invites exactly this behavior even from a non-converting visitor).
  let saveIntent = false;
  if (!clicked) {
    let saveProb = (persona.weights.lowFriction || 0.3) * 0.6;
    if (page.messageTag === 'lowFriction') saveProb += 0.15;
    if (bounced) saveProb *= 0.5; // an early, hard bounce rarely converts to a save
    saveIntent = Math.random() < Math.min(0.9, saveProb);
  }

  const totalDwell = sectionResults.reduce((s, r) => s + r.dwell, 0);
  const scrollDepthPct = Math.round((sectionResults.length / page.sections.length) * 100 * (bounced ? jitter(0.75, 1) : 1));

  return {
    pageId: page.id,
    personaId: persona.id,
    bounced,
    bounceAtSection,
    clicked,
    ctaHesitation,
    saveIntent,
    scrollDepthPct: Math.min(100, scrollDepthPct),
    totalDwell,
    sectionResults,
    chipWins
  };
}

// Runs the full simulation. sessionsPerCombo default 40 -> 5 personas x N pages x 40.
window.WP.runSimulation = function (pages, personas, sessionsPerCombo) {
  sessionsPerCombo = sessionsPerCombo || 40;
  const sessions = [];
  personas.forEach(persona => {
    pages.forEach(page => {
      for (let i = 0; i < sessionsPerCombo; i++) {
        sessions.push(simulateSession(persona, page));
      }
    });
  });
  return sessions;
};

// Simulates ONE visitor across up to maxVisits attempts. A visitor who
// doesn't convert but showed save/return intent on a given visit comes
// back with slightly higher familiarity (more comfortable, less friction);
// a visitor who bounces outright with no save intent is gone for good.
// This is a separate, additive model - it does not replace or feed into
// the single-visit simulation the rest of the app is built on.
window.WP.simulateVisitor = function (persona, page, maxVisits) {
  maxVisits = maxVisits || 3;
  const visits = [];
  let converted = false;
  let familiarity = 0;
  for (let v = 0; v < maxVisits; v++) {
    const session = simulateSession(persona, page, familiarity);
    session.visitNumber = v + 1;
    visits.push(session);
    if (session.clicked) { converted = true; break; }
    if (!session.saveIntent) break;
    familiarity = Math.min(0.6, familiarity + 0.2);
  }
  return { personaId: persona.id, pageId: page.id, visits, converted, totalVisits: visits.length };
};

// Runs the multi-visit model across every persona x page combination.
// visitorsPerCombo is kept smaller than sessionsPerCombo by default since
// each visitor can trigger up to maxVisits simulated sessions internally.
window.WP.runMultiVisitSimulation = function (pages, personas, visitorsPerCombo, maxVisits) {
  visitorsPerCombo = visitorsPerCombo || 25;
  const visitors = [];
  personas.forEach(persona => {
    pages.forEach(page => {
      for (let i = 0; i < visitorsPerCombo; i++) {
        visitors.push(window.WP.simulateVisitor(persona, page, maxVisits));
      }
    });
  });
  return visitors;
};
