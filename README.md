# AppOpps — Landing Page Experimentation Loop

A web app exploring how landing pages can auto-improve over time through experimentation and simulated user behavior, built for an industry GTM Challenge.

**Live demo:** https://ava-00.github.io/AppOpps/

---

## The idea

Five landing pages sell the same product — AppOpps, a job application tracker — to five different kinds of job seeker, each with a different angle:

| Page | Persona | Angle |
|---|---|---|
| New Recruit | First-time job seekers | Structure & reassurance |
| Active Duty | Active applicants | Speed & volume tooling |
| Reserve Status | Passive applicants | Zero-friction, one click |
| Classified | Stealth switchers | Discretion & privacy |
| Redeployment | Career changers | Reframing your story |

Five simulated personas (matching the five audiences above) generate persona-weighted fake sessions — clicks, scroll depth, section dwell time, CTA hesitation, save/return intent — against all five pages. The system analyzes what actually held attention and converted, then drafts a new page variant informed by that data: same headline if it's winning, a swapped section if a better one was found elsewhere, a reordered feature list if one item consistently out-performed the others, a different CTA if warranted. Every decision — including "nothing beat what was already there" — is logged with the metric behind it, not just the outcome.

## Why rule-based, not an LLM

The brief doesn't require generative AI, and I didn't have API access for this build — but on reflection, rule-based generation is arguably the better fit for what's being evaluated here. The brief asks specifically for insight into *how a system can learn from user behavior*. A transparent, inspectable decision engine (see the Decision Log in the app) makes that reasoning legible in a way an LLM call wouldn't. Every generated variant comes with a full audit trail: which metric was compared, what the actual scores were, and why the system kept or changed each piece.

## Architecture

Plain HTML/CSS/JS, no build step, no framework, no backend, no API keys. Deploys anywhere static (GitHub Pages, Netlify, Vercel) by copying the folder.

```
index.html              dashboard ("Campaign Comparison HQ")
pages/page-[a-e].html   the 5 real, standalone landing pages
css/styles.css          shared design tokens (military-ops visual identity)
js/personas.js          persona weight profiles
js/pages-config.js      page/section content + tagging + metric explainer text
js/simulator.js         generates persona-weighted fake sessions
js/analysis.js          aggregates sessions into every tracked metric
js/generator.js         rule-based decision engine + explanation builder
js/mock-data.js         randomizes/shuffles sample-data feature previews
js/app.js               orchestrates the dashboard UI
```

## What's tracked

Beyond conversion rate: scroll depth, CTA hesitation (time spent deciding), save/return intent among non-converters, skip/skim/read classification per section (dwell relative to actual word count), bounce point (which section people quit at), chip-level engagement (which specific feature/FAQ item held attention), run-to-run fluctuation (so a "win" can be judged against ordinary sampling noise, not read as exact), multi-visit conversion modeling (some visitors return before converting), and a headline-only isolation test (holds everything else constant to isolate that one variable).

## What's real vs. what's illustrative

The simulation, analysis, and generation logic all run for real, live, in your browser, every time you click "Launch field test." The five landing pages include a few feature-preview sections (spreadsheet export, a market news feed, a cold-email tracker) that are explicitly labeled **"sample data — preview"** — these are static/randomized illustrative content, not live integrations, since a genuinely live Google Sheets/LinkedIn connection would require OAuth and a backend that don't belong in a static, dependency-free deployment. This is a deliberate scope decision, not an oversight.

## Running it

No build step required.

```bash
cd waypoint
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` directly in a browser.

Click **"Launch field test & generate next operation"** to run a full cycle. Click **"Deploy & run next operation"** to fold the winner into the pool and iterate again — conversion trend is tracked across generations in the history chips.

## Honest limitations

- The 5 original pages are static by design (they're the fixed baseline being compared) — only the generated "Operation" pages and the sample-data numbers change between runs.
- A generated variant sometimes comes back looking identical to its source page — that's the decision log correctly reporting "nothing beat this," not a bug.
- All "randomness" is pseudo-random in-browser simulation; nothing here reflects real user data.

## What I'd do with more time

- A/B the generator's rule-based approach against an LLM-based one (with API access) to compare reasoning quality
- Persist run history across sessions (currently resets on page reload)
- A reset button and a "collapse to summary" toggle for the denser panels
- Real significance testing (t-test) in place of the current min-max fluctuation band
