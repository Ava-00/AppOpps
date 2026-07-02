// Simulates user sessions across every persona x page combination.
// No real users, no external data - purely persona-weighted randomness,
// but the weighting logic is what makes the "learning" step meaningful.
window.WP = window.WP || {};

function jitter(min, max) {
  return min + Math.random() * (max - min);
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

function simulateSession(persona, page) {
  const sectionResults = [];
  let bounced = false;
  let bounceAtSection = null;
  let reachedCTA = false;

  for (let i = 0; i < page.sections.length; i++) {
    const section = page.sections[i];
    const affinity = sectionAffinity(section, persona.weights);
    const baseDwell = window.WP.baseDwellByRole[section.role] || 6;
    const dwell = Math.round(baseDwell * (0.4 + affinity * 1.3) * jitter(0.8, 1.2));

    sectionResults.push({ sectionId: section.id, role: section.role, label: section.label, dwell, affinity: +affinity.toFixed(2) });

    const isLast = i === page.sections.length - 1;
    if (!isLast) {
      const continueProb = Math.min(0.97, 0.3 + affinity * 0.45 * (0.6 + persona.scrollPatience) + persona.scrollPatience * 0.15);
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
  if (reachedCTA) {
    const ctaSection = page.sections[page.sections.length - 1];
    const ctaAffinity = sectionAffinity(ctaSection, persona.weights);
    const clickProb = Math.min(0.95, 0.05 + 0.75 * ctaAffinity * persona.ctaSensitivity);
    clicked = Math.random() < clickProb;
  }

  const totalDwell = sectionResults.reduce((s, r) => s + r.dwell, 0);
  const scrollDepthPct = Math.round((sectionResults.length / page.sections.length) * 100 * (bounced ? jitter(0.75, 1) : 1));

  return {
    pageId: page.id,
    personaId: persona.id,
    bounced,
    bounceAtSection,
    clicked,
    scrollDepthPct: Math.min(100, scrollDepthPct),
    totalDwell,
    sectionResults
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
