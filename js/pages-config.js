// Page variant configuration.
// Each section carries a "tags" map: which messaging dimensions it leans into,
// and how strongly (weights don't need to sum to 1 - a section can carry a
// primary tag plus a secondary undertone, which is what creates cross-over
// appeal between pages and personas).
//
// Sections that list several small items (feature grids, notification lists,
// privacy assurances) carry a "chips" array instead of baking the list into
// bodyHTML. This lets the simulator track which individual chip held
// attention, and lets the generator re-order chips by what was actually
// learned rather than just swapping whole sections. bodyHTML on a
// chip-bearing section holds only the section's intro (eyebrow/heading/lede);
// the chip grid is rendered separately.
//
// A few sections below are feature PREVIEWS for things like spreadsheet
// export, a market news feed, or a cold-email tracker. These are mocked,
// static sample content - clearly labeled SAMPLE DATA in the markup - not
// live integrations. See project notes: a static, no-backend site can't
// safely hold OAuth secrets or API keys, so previews are the honest way to
// show product direction here.
window.WP = window.WP || {};

window.WP.pages = [
  {
    id: 'A',
    file: 'pages/page-a.html',
    name: 'New Recruit',
    angle: 'Aimed at first-timers',
    messageTag: 'structure',
    headline: 'Basic training for your first campaign',
    ctaCopy: 'Report for duty - free',
    hypothesis: 'First-timers are anxious more than impatient - they should respond better to structure, reassurance, and step-by-step guidance than to speed or privacy framing.',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { structure: 0.9 },
        bodyHTML: '<div class="eyebrow">New Recruit</div><h1>Basic training for your first campaign</h1><p class="lede">AppOpps gives every application a clear rank in the chain of command, so you always know your next move.</p>' },
      { id: 'howItWorks', role: 'feature', label: 'Standard operating procedure', tags: { structure: 0.8, privacy: 0.2 },
        bodyHTML: '<div class="eyebrow">Standard operating procedure</div><h2>Three orders, no training required</h2>',
        chips: [
          { id: 'sop1', stat: '01', label: 'Add a target from any posting in one click' },
          { id: 'sop2', stat: '02', label: 'AppOpps tracks status automatically as you advance', weight: 1.3 },
          { id: 'sop3', stat: '03', label: 'Your intel stays yours' },
          { id: 'sop4', stat: '04', label: 'A briefing before every deadline' }
        ] },
      { id: 'feature', role: 'feature', label: 'Situation report', tags: { structure: 0.7 },
        bodyHTML: '<div class="eyebrow">Situation report</div><h2>One clear line of sight on every operation</h2><div class="card"><div class="label mono" style="color:var(--accent-2)">● Deployed → Engaged → Offer secured</div></div>' },
      { id: 'quotes', role: 'motivate', label: 'Field morale', tags: { structure: 0.5, reflective: 0.2 },
        bodyHTML: '<div class="eyebrow">Field morale <span class="mono sample-tag">sample data - preview, refreshes each visit</span></div><h2>A daily boost, built in</h2><p class="lede">A rotating line of encouragement each time you open AppOpps - day one of basic training is the hardest.</p>',
        chips: [
          { id: 'q1', stat: '“', label: 'Every rejection is reconnaissance.' },
          { id: 'q2', stat: '“', label: 'Discipline beats motivation on the hard days.' },
          { id: 'q3', stat: '“', label: 'You only need one yes.', weight: 1.2 }
        ] },
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
    hypothesis: 'Active applicants are optimizing for throughput - they should respond to volume/efficiency framing and operational tooling more than encouragement or discretion.',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { speed: 0.9 },
        bodyHTML: '<div class="eyebrow">Active Duty</div><h1>Run multiple operations at once</h1><p class="lede">Command every application, every recruiter contact, every follow-up from a single ops board.</p>' },
      { id: 'stats', role: 'stats', label: 'Ops readout', tags: { speed: 0.9 },
        bodyHTML: '<div class="stats-bar"><div class="stat-item"><div class="num">50+</div><div class="lab">operations tracked at once</div></div><div class="stat-item"><div class="num">3 sec</div><div class="lab">to log a new operation</div></div><div class="stat-item"><div class="num">0</div><div class="lab">spreadsheets deployed</div></div></div>' },
      { id: 'dashboardFeature', role: 'feature', label: 'Field equipment', tags: { speed: 0.8, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Field equipment</div><h2>One ops board, sorted by what needs orders next</h2>',
        chips: [
          { id: 'fe1', stat: 'Bulk deployment', label: 'Pull operations in from your inbox in seconds' },
          { id: 'fe2', stat: 'Follow-up queue', label: 'See who\'s overdue for contact' }
        ] },
      { id: 'opsBoard', role: 'feature', label: 'Deadline watch', tags: { speed: 0.7, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Deadline watch <span class="mono sample-tag">sample data - preview, refreshes each visit</span></div><h2>Never miss a follow-up window</h2><p class="lede">AppOpps flags what needs action today, so nothing goes stale in the queue.</p>',
        chips: [
          { id: 'd1', stat: 'Due today', label: '<span data-mock=\'{"min":1,"max":5}\'>2</span> follow-ups overdue by 3+ days' },
          { id: 'd2', stat: 'This week', label: '<span data-mock=\'{"min":2,"max":7}\'>4</span> interview deadlines to confirm' },
          { id: 'd3', stat: 'Export', label: 'One-click export to Sheets or Excel', weight: 1.4 }
        ] },
      { id: 'marketIntel', role: 'proof', label: 'Market SITREP', tags: { speed: 0.5, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Market SITREP <span class="mono sample-tag">sample data - preview, refreshes each visit</span></div><h2>Know the terrain before you move</h2><p class="lede">A read on your target industries - hiring trends and fresh funding - so you know where the openings are.</p>',
        chips: [
          { id: 'n1', stat: 'Hiring up', label: 'Enterprise SaaS postings +<span data-mock=\'{"min":6,"max":22}\'>12</span>% this month' },
          { id: 'n2', stat: 'Series B', label: '<span data-mock=\'{"min":1,"max":5}\'>3</span> companies on your list just raised', weight: 1.3 },
          { id: 'n3', stat: 'Watch', label: 'Layoff alerts for companies you\'ve applied to' }
        ] },
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
    hypothesis: 'Passive browsers convert only if there is near-zero friction - length or persuasion should actively hurt this page rather than help it.',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { lowFriction: 0.9 },
        bodyHTML: '<div class="eyebrow">Reserve Status</div><h1>Stand by. Decide when ready.</h1><p class="lede">Spotted a target of opportunity? File it in one click. No orders issued until you say so.</p>' },
      { id: 'visual', role: 'feature', label: 'Reserve file preview', tags: { lowFriction: 0.8 },
        bodyHTML: '<div class="card" style="padding:24px;"><div class="label mono" style="color:var(--accent-2); margin-bottom:8px;">reserve status · no orders filed · no timeline</div><p style="margin:0; color:var(--ink); font-size:15px;">Senior Product Designer - Notion<br>Filed 4 days ago</p></div>' },
      { id: 'quickExport', role: 'feature', label: 'Zero-effort logging', tags: { lowFriction: 0.8 },
        bodyHTML: '<div class="eyebrow">Zero-effort logging <span class="mono sample-tag">sample data - preview</span></div><h2>Filed straight to a sheet you already use</h2><p class="lede">No new dashboard to check. Saved roles land in a Google Sheet or Excel file, quietly, in the background.</p>',
        chips: [
          { id: 'e1', stat: '1 click', label: 'Save a role, it appears in your sheet' },
          { id: 'e2', stat: 'Your format', label: 'Matches columns you already track', weight: 1.2 }
        ] },
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
    hypothesis: 'Stealth switchers weight discretion above every other factor - privacy assurance should outperform any efficiency or reassurance framing for this audience specifically.',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { privacy: 0.9 },
        bodyHTML: '<div class="eyebrow">Classified</div><h1>Run a covert operation. Leave no trace.</h1><p class="lede">Track your campaign without a single notification, calendar sync, or shared login that could compromise your cover.</p>' },
      { id: 'privacyDetail', role: 'proof', label: 'Need-to-know basis', tags: { privacy: 1.0 }, chipStyle: 'privacy-note',
        bodyHTML: '<div class="eyebrow">Need-to-know basis</div><h2>Nothing about AppOpps gives up your position</h2>',
        chips: [
          { id: 'pd1', stat: '✕', label: 'No calendar invites, no email notifications sent anywhere current command could intercept' },
          { id: 'pd2', stat: '✕', label: 'No company logins, no browser extensions that show up in IT surveillance', weight: 1.2 }
        ] },
      { id: 'noSync', role: 'proof', label: 'What AppOpps does not do', tags: { privacy: 0.8 }, chipStyle: 'privacy-note',
        bodyHTML: '<div class="eyebrow">What AppOpps does not do <span class="mono sample-tag">sample data - preview</span></div><h2>No syncing, no accounts, no trail</h2><p class="lede">Every integration is a potential leak. Covert operations run with none.</p>',
        chips: [
          { id: 'p1', stat: '✕', label: 'No Google or Microsoft account required' },
          { id: 'p2', stat: '✕', label: 'No LinkedIn or Indeed connection', weight: 1.3 },
          { id: 'p3', stat: '✕', label: 'No data leaves this device unless you export it yourself' }
        ] },
      { id: 'trust', role: 'proof', label: 'Field report', tags: { privacy: 0.7, reflective: 0.2 },
        bodyHTML: '<div class="quote">"I needed something that wouldn\'t show up if anyone glanced at my screen." <div class="who">- Field report, covert operation</div></div>' },
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
    hypothesis: 'Career changers need to trust their story makes sense before acting - reassurance-heavy, longer-form content should hold attention rather than cause bounce, unlike on the other pages.',
    sections: [
      { id: 'hero', role: 'hero', label: 'Hero', tags: { reflective: 0.9 },
        bodyHTML: '<div class="eyebrow">Redeployment Orders</div><h1>Redeploy your experience to a new front</h1><p class="lede">AppOpps helps you organize not just where you\'re applying, but how your service record translates to the new post.</p>' },
      { id: 'tagFeature', role: 'feature', label: 'Service record tags', tags: { reflective: 0.7, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Service record</div><h2>Tag every operation by why it fits your record</h2>',
        chips: [
          { id: 'tf1', stat: '#tag', label: 'transferable-skills' },
          { id: 'tf2', stat: '#tag', label: 'reassignment-fit' }
        ] },
      { id: 'outreachToolkit', role: 'feature', label: 'Outreach tracker', tags: { reflective: 0.6, structure: 0.2 },
        bodyHTML: '<div class="eyebrow">Outreach tracker <span class="mono sample-tag">sample data - preview, refreshes each visit</span></div><h2>Know who\'s gone quiet</h2><p class="lede">Track cold emails to your network - sent, opened, replied - with suggested matches based on your service record tags.</p>',
        chips: [
          { id: 'o1', stat: 'Sent', label: '<span data-mock=\'{"min":5,"max":25}\'>12</span> cold emails logged this week' },
          { id: 'o2', stat: 'Replied', label: '<span data-mock=\'{"min":0,"max":6}\'>3</span> responses - prioritized to the top' },
          { id: 'o3', stat: 'Suggested', label: '<span data-mock=\'{"min":1,"max":4}\'>2</span> roles matched to your #reassignment-fit tags', weight: 1.3 }
        ] },
      { id: 'faq', role: 'faq', label: 'Debrief', tags: { reflective: 0.9 },
        bodyHTML: '<div class="eyebrow">Debrief</div><h2>You\'re not starting from zero</h2><div class="faq-item"><h3>I have a gap in my record. Does that matter here?</h3><p>Build a note for how you\'ll frame it - before it comes up during debrief.</p></div><div class="faq-item"><h3>My service was in a different theater entirely.</h3><p>Fit-tagging connects what you\'ve done to the front you\'re applying to.</p></div>' },
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
  motivate: 5,
  cta: 5
};

// Plain-English intuition for each trackable metric - surfaced directly in
// the dashboard so the reasoning isn't left implicit.
window.WP.metricExplainers = {
  conversion: 'Share of simulated visitors who clicked the final CTA. The headline outcome metric - everything else exists to explain why this number moves.',
  scrollDepth: 'How far down the page the average visitor got before leaving, as a percent of total sections. Low scroll depth on a short page is normal; low scroll depth on a long page means the top of the page isn\'t earning the scroll.',
  ctaHesitation: 'Average seconds spent on the CTA section itself before clicking (or leaving). A high number paired with a low conversion rate usually means the offer was seen but not trusted - a copy problem, not a visibility problem.',
  chipEngagement: 'Within a list-style section (feature grid, FAQ, privacy assurances), which individual item held the most simulated attention. This is the signal the generator uses to re-order a list, not just swap it out entirely.',
  saveIntent: 'Of visitors who did NOT click the CTA, the share who still showed save/return behavior (i.e. didn\'t bounce immediately, lingered near the end). High save intent with low conversion suggests interest without urgency - a nudge or deadline framing problem, not a relevance problem.',
  fluctuation: 'Every simulation run uses fresh random sessions, so raw numbers wobble a little between runs even with zero real change to the pages. This shows the actual min-max spread from 5 repeated runs of the current pool, so a genuine difference between two pages can be told apart from ordinary sampling noise. If two pages\' bars overlap within this band, don\'t treat the gap between them as meaningful yet.',
  bounceBreakdown: 'Among visitors who left without converting, which single section they left AT. A drop-off concentrated at the hero means the headline itself is the problem - people never even get invested. A drop-off concentrated deep in the page means the concept is landing but something specific mid-page is losing people, which is a narrower, more fixable problem.',
  engagementMix: 'Dwell time alone can\'t tell a genuine read from someone scrolling past with the tab in the background. Each section visit is classified as a skip (barely registered), skim (some attention, not fully read), or read (matched or beat the time it would take to actually read that content), based on dwell relative to word count. A page that\'s mostly "skim" even with decent dwell numbers has an attention problem dwell time alone would hide.',
  multiVisit: 'Real visitors don\'t always decide on the first look - some leave, think it over, and come back. This models each simulated person getting up to 3 visits if they showed save/return intent instead of bouncing outright, becoming slightly more comfortable each return. Comparing first-visit-only conversion to multi-visit conversion shows how much of a page\'s real potential is invisible if you only count first impressions.',
  headlineIsolation: 'The main experiment bundles several changes together (section, CTA, list order) into one variant, so it can\'t say which single change mattered most. This test holds everything except the headline fixed at the current winning page\'s content, and swaps in only the headline from each other page - isolating the headline\'s effect on its own, the way a real single-variable test would.',
  metricInfluence: 'Not every tracked metric moves together, and not every one is actually telling you something different this round. This ranks each metric by how much it varies across the current pool relative to its own average - the metric at the top is the one actually distinguishing pages from each other right now, and the most useful one to design around next. A metric near the bottom barely differs between pages, so a gap there probably isn\'t why one page is beating another.'
};
