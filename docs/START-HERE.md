# Start here: the hackr handover

Written on 2 November 2026 so a new Claude Code session can start building straight away. Read
[CLAUDE.md](../CLAUDE.md) for the rules every change follows.

## The idea

**hackr** is a hackathon finder and coach for early-career developers and students who want to
join more hackathons and actually place. The job it does: "Tell me which hackathons I should
join and how to win them, without me reading ten pages each time."

Ahmed's full outline is in [mvp-outline.md](mvp-outline.md). In short, three flows:

1. **Discover hackathons for me:** a short profile (skills, stack, interests, time zone, online
   or in person, experience), then upcoming events ranked by a fit score.
2. **Deep-dive on one hackathon:** one digestible brief: what it is, who can join, key dates,
   prizes; what the judges weigh most and what to nail; a submission checklist.
3. **Patterns from past winners:** common stacks, domains, team sizes, demo formats, and a short
   playbook for that kind of event. This is the part that sets hackr apart.

On top sits the coach: a prep plan, and strategy notes tied to the judging rubric ("technical
quality is 30%: spend the time on a reliable demo, not five extra features").

Ahmed called the work urgent: aim for a working first loop quickly, then widen it.

## What is decided

- The persona and the three flows above.
- The structured fields per event: basics (name, dates, format, organiser, prizes, tracks, tech
  requirements), rules (eligibility, team size, deliverables, deadlines), judging criteria with
  weights, and past winners (project, description, stack, links).
- A normalised relational schema, so questions like "AI hackathons that weigh impact over
  technique" can be answered later.
- Every number the user sees (fit scores, weights, dates) is computed in code and tested; a
  language model may summarise and explain, never invent the figures.
- The house rules in CLAUDE.md: issues, typed branches, Conventional Commits, signed commits as
  Ahmed, merge only after an interactive yes, a public repository with no secrets.

## The blocker: Devpost's terms forbid scraping

The outline scrapes Devpost first. Its robots.txt allows general crawlers, but its
[Terms of Service](https://info.devpost.com/terms) (last updated 5 December 2025, read on
2 November 2026) say users may not:

- use "manual or automated software, devices, scripts robots, or other means or processes to
  access" the site, or "'scrape,' 'crawl' or 'spider' the Site, User Content (including User
  Profiles and Team Pages)" (section 4, Code of Conduct);
- "create derivative works" based on Devpost Content; "Unauthorized copying or use of any
  Devpost Content … without the express written consent of Devpost is strictly prohibited"
  (section 7A).

Terms override robots.txt, so **Devpost is not scraped without written permission** (CLAUDE.md
rule 5). The ways forward, to decide first:

| Option | What it means | Speed |
| --- | --- | --- |
| A. Ask Devpost | Email for written permission or a data partnership | Slow, uncertain; worth sending now in parallel |
| B. Permitted sources | Sources whose terms allow collection or offer an API or feed: MLH, Devfolio, DoraHacks, ETHGlobal, lablab.ai, Luma event pages and others, each to be checked | Medium |
| C. Paste the rules | The user pastes a hackathon's rules and judging text (or uploads a PDF); hackr builds the brief, the checklist and the strategy from it | Fast, works for any hackathon, no scraping |
| D. Organisers submit | Organisers list their events in hackr | Slow to grow |

A sensible start: **C first** (the coach works on day one for any hackathon), then **B** for the
listing and the fit score, and **A** sent in parallel. Ahmed decides.

## Prior art found so far

Not yet a full review; these came up while reading Devpost's terms:

- [`devpost-api`](https://pypi.org/project/devpost-api/), an unofficial Python client on PyPI.
- Two GitHub scrapers: [jayrav13/devpost-scraper](https://github.com/jayrav13/devpost-scraper)
  and [agl320/devpost-scraper](https://github.com/agl320/devpost-scraper).
- Paid Devpost scrapers on [Apify](https://apify.com/automation-lab/devpost-scraper/api/cli) and
  [Bright Data](https://brightdata.com/products/web-scraper/devpost).

They collect data. None of them is a coach that turns a rubric and past winners into a plan,
which is where hackr differs. A proper review of existing hackathon finders and coaching tools is
one of the first steps.

## Open questions for Ahmed

1. Which data route: C, B, A, or a mix (above)?
2. Stack. A suggestion for speed: one Next.js (TypeScript) app with Postgres, or a Python
   FastAPI backend with a Next.js frontend if the parsing and analysis side should be Python.
3. Hosting: Vercel, Fly.io, Render, or another.
4. Licence for the public repository: MIT, Apache-2.0, or another.
5. Language model for summaries and briefs: the Claude API, with the key kept out of the repo.
6. Sign-in: GitHub OAuth, email links, or none for the first version.

## First steps, in order

1. Settle the data route and the stack (one issue, decisions recorded in `docs/decisions.md`).
2. `docs/sources.md`: each source's terms and robots.txt read and cited, with what may be
   collected.
3. Scaffold the app, extend `make check` with the linters and tests, and run it in CI.
4. The data model, with fixtures of fictional events, rubrics and winners.
5. The coach from pasted rules: extract dates, eligibility, deliverables and judging criteria
   with weights; build the brief, the checklist and rubric-weighted strategy notes, with tests.
6. Profiles and the fit score, then the event list with filters.
7. Past-winner patterns, from sources that allow it.
8. Summaries from a language model, with every figure taken from the computed data.

## Environment

- macOS; `gh` logged in as `ayobamy`; origin uses the `github-personal` SSH alias.
- Commits are signed with SSH through Ahmed's global git config.
- A sister project with the same house rules: `~/skills/agent-skills` (private).
