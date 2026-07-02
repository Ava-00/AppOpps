// Persona weight profiles.
// Each dimension (0-1) is how strongly that persona responds to messaging/sections
// tagged with that dimension. ctaSensitivity = how readily they click once they
// reach a CTA that matches their affinity. scrollPatience = how likely they are
// to keep reading past a section that doesn't strongly match their affinity.
window.WP = window.WP || {};

window.WP.personas = [
  {
    id: 'firstTimers',
    name: 'First-time job seekers',
    blurb: 'Starting out, anxious, want structure and reassurance.',
    weights: { structure: 0.9, speed: 0.2, lowFriction: 0.3, privacy: 0.2, reflective: 0.4 },
    ctaSensitivity: 0.5,
    scrollPatience: 0.6
  },
  {
    id: 'activeApplicants',
    name: 'Active applicants',
    blurb: 'Searching urgently, high volume, want efficiency.',
    weights: { structure: 0.3, speed: 0.9, lowFriction: 0.4, privacy: 0.2, reflective: 0.1 },
    ctaSensitivity: 0.8,
    scrollPatience: 0.25
  },
  {
    id: 'passiveApplicants',
    name: 'Passive applicants',
    blurb: 'Employed, casually browsing, low urgency, bounces fast.',
    weights: { structure: 0.2, speed: 0.3, lowFriction: 0.9, privacy: 0.2, reflective: 0.1 },
    ctaSensitivity: 0.7,
    scrollPatience: 0.15
  },
  {
    id: 'stealthSwitchers',
    name: 'Stealth switchers',
    blurb: 'Employed, searching discreetly, need privacy assurance.',
    weights: { structure: 0.4, speed: 0.2, lowFriction: 0.3, privacy: 0.9, reflective: 0.3 },
    ctaSensitivity: 0.45,
    scrollPatience: 0.5
  },
  {
    id: 'careerChangers',
    name: 'Career changers / re-entrants',
    blurb: 'Pivoting industries or returning after a gap, need to reframe their story.',
    weights: { structure: 0.3, speed: 0.1, lowFriction: 0.2, privacy: 0.3, reflective: 0.9 },
    ctaSensitivity: 0.35,
    scrollPatience: 0.75
  }
];
