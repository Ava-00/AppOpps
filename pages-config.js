// Page variant configuration.
// Each section carries a "tags" map: which messaging dimensions it leans into,
// and how strongly (weights don't need to sum to 1 - a section can carry a
// primary tag plus a secondary undertone, which is what creates cross-over
// appeal between pages and personas).
window.WP = window.WP || {};

window.WP.pages = [
  {
    id: 'A',
    file: 'pages/page-a.html',
    name: 'New Recruit',
    angle: 'Aimed at first-timers',
    messageTag: 'structure',
    headline: 'Basic training for your first campaign',
    ctaCopy: 'Report for duty — free',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { structure: 0.9 },
        bodyHTML: '<div class="eyebrow">New Recruit</div><h1>Basic training for your first campaign</h1><p class="lede">AppOpps gives every application a clear rank in the chain of command, so you always know your next move.</p>' },
      { id: 'howItWorks', role: 'feature', label: 'Standard operating procedure', tags: { structure: 0.8, privacy: 0.2 },
        bodyHTML: '<div class="eyebrow">Standard operating procedure</div><h2>Three orders, no training required</h2><div class="feature-grid"><div class="card"><div class="stat">01</div><div class="label">Add a target from any posting in one click</div></div><div class="card"><div class="stat">02</div><div class="label">AppOpps tracks status automatically as you advance</div></div><div class="card"><div class="stat">03</div><div class="label">Your intel stays yours</div></div><div class="card"><div class="stat">04</div><div class="label">A briefing before every deadline</div></div></div>' },
      { id: 'feature', role: 'feature', label: 'Situation report', tags: { structure: 0.7 },
        bodyHTML: '<div class="eyebrow">Situation report</div><h2>One clear line of sight on every operation</h2><div class="card"><div class="label mono" style="color:var(--accent-2)">● Deployed → Engaged → Offer secured</div></div>' },
      { id: 'cta', role: 'cta', label: 'CTA', tags: { structure: 0.6, speed: 0.1 } }
    ]
  },
  {
    id: 'B',
    file: 'pages/page-b.html',
    name: 'Active Duty',
    angle: 'Aimed at active applicants',
    messageTag: 'speed',
    headline: 'Run multiple operations at once',
    ctaCopy: 'Take command',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { speed: 0.9 },
        bodyHTML: '<div class="eyebrow">Active Duty</div><h1>Run multiple operations at once</h1><p class="lede">Command every application, every recruiter contact, every follow-up from a single ops board.</p>' },
      { id: 'stats', role: 'stats', label: 'Ops readout', tags: { speed: 0.9 },
        bodyHTML: '<div class="stats-bar"><div class="stat-item"><div class="num">50+</div><div class="lab">operations tracked at once</div></div><div class="stat-item"><div class="num">3 sec</div><div class="lab">to log a new operation</div></div><div class="stat-item"><div class="num">0</div><div class="lab">spreadsheets deployed</div></div></div>' },
      { id: 'dashboardFeature', role: 'feature', label: 'Field equipment', tags: { speed: 0.8, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Field equipment</div><h2>One ops board, sorted by what needs orders next</h2><div class="feature-grid"><div class="card"><div class="stat mono" style="font-size:16px;color:var(--accent-2)">Bulk deployment</div><div class="label">Pull operations in from your inbox in seconds</div></div><div class="card"><div class="stat mono" style="font-size:16px;color:var(--accent-2)">Follow-up queue</div><div class="label">See who\'s overdue for contact</div></div></div>' },
      { id: 'cta', role: 'cta', label: 'CTA', tags: { speed: 0.7 } }
    ]
  },
  {
    id: 'C',
    file: 'pages/page-c.html',
    name: 'Reserve Status',
    angle: 'Aimed at passive applicants',
    messageTag: 'lowFriction',
    headline: 'Stand by. Decide when ready.',
    ctaCopy: 'File it in 10 seconds',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { lowFriction: 0.9 },
        bodyHTML: '<div class="eyebrow">Reserve Status</div><h1>Stand by. Decide when ready.</h1><p class="lede">Spotted a target of opportunity? File it in one click. No orders issued until you say so.</p>' },
      { id: 'visual', role: 'feature', label: 'Reserve file preview', tags: { lowFriction: 0.8 },
        bodyHTML: '<div class="card" style="padding:24px;"><div class="label mono" style="color:var(--accent-2); margin-bottom:8px;">reserve status · no orders filed · no timeline</div><p style="margin:0; color:var(--ink); font-size:15px;">Senior Product Designer — Notion<br>Filed 4 days ago</p></div>' },
      { id: 'cta', role: 'cta', label: 'CTA', tags: { lowFriction: 0.9, speed: 0.2 } }
    ]
  },
  {
    id: 'D',
    file: 'pages/page-d.html',
    name: 'Classified',
    angle: 'Aimed at stealth switchers',
    messageTag: 'privacy',
    headline: 'Run a covert operation. Leave no trace.',
    ctaCopy: 'Go covert',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { privacy: 0.9 },
        bodyHTML: '<div class="eyebrow">Classified</div><h1>Run a covert operation. Leave no trace.</h1><p class="lede">Track your campaign without a single notification, calendar sync, or shared login that could compromise your cover.</p>' },
      { id: 'privacyDetail', role: 'proof', label: 'Need-to-know basis', tags: { privacy: 1.0 },
        bodyHTML: '<div class="eyebrow">Need-to-know basis</div><h2>Nothing about AppOpps gives up your position</h2><div class="privacy-note" style="margin-bottom:12px;"><div class="dot"></div><div>No calendar invites, no email notifications sent anywhere current command could intercept.</div></div><div class="privacy-note"><div class="dot"></div><div>No company logins, no browser extensions that show up in IT surveillance.</div></div>' },
      { id: 'trust', role: 'proof', label: 'Field report', tags: { privacy: 0.7, reflective: 0.2 },
        bodyHTML: '<div class="quote">"I needed something that wouldn\'t show up if anyone glanced at my screen." <div class="who">— Field report, covert operation</div></div>' },
      { id: 'cta', role: 'cta', label: 'CTA', tags: { privacy: 0.6 } }
    ]
  },
  {
    id: 'E',
    file: 'pages/page-e.html',
    name: 'Redeployment',
    angle: 'Aimed at career changers',
    messageTag: 'reflective',
    headline: 'Redeploy your experience to a new front',
    ctaCopy: 'Begin redeployment',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { reflective: 0.9 },
        bodyHTML: '<div class="eyebrow">Redeployment Orders</div><h1>Redeploy your experience to a new front</h1><p class="lede">AppOpps helps you organize not just where you\'re applying, but how your service record translates to the new post.</p>' },
      { id: 'tagFeature', role: 'feature', label: 'Service record tags', tags: { reflective: 0.7, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Service record</div><h2>Tag every operation by why it fits your record</h2><div class="feature-grid"><div class="card"><div class="label mono" style="color:var(--accent-2)">#transferable-skills</div></div><div class="card"><div class="label mono" style="color:var(--accent-2)">#reassignment-fit</div></div></div>' },
      { id: 'faq', role: 'faq', label: 'Debrief', tags: { reflective: 0.9 },
        bodyHTML: '<div class="eyebrow">Debrief</div><h2>You\'re not starting from zero</h2><div class="faq-item"><h3>I have a gap in my record. Does that matter here?</h3><p>Build a note for how you\'ll frame it — before it comes up during debrief.</p></div><div class="faq-item"><h3>My service was in a different theater entirely.</h3><p>Fit-tagging connects what you\'ve done to the front you\'re applying to.</p></div>' },
      { id: 'cta', role: 'cta', label: 'CTA', tags: { reflective: 0.5 } }
    ]
  }
];

// Base dwell time in seconds by section role, before persona affinity scaling.
window.WP.baseDwellByRole = {
  hero: 6,
  stats: 4,
  feature: 9,
  proof: 8,
  faq: 11,
  cta: 5
};
