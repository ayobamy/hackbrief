# Competitors and prior art

Existing hackathon finders and coaching tools, read on 2 November 2026, and where hackbrief differs.
hackbrief combines four things: a **finder** across sources, a **fit score** for one person, a
**coach** that turns an event's own judging rubric into a weighted plan, and **patterns from past
winners**. No product found combines all four, and most finders scrape sites whose terms forbid it.

## Finders and lists

| Product | What it does | Data | How hackbrief differs |
| --- | --- | --- | --- |
| [HackathonRadar](https://hackathonradar.com) | The closest finder: reads 51 to 53 platforms daily, removes duplicates, scores event quality, "near me", alerts, Discord, webhooks, an API and paid tiers; claims 15,800 events in 139 countries | Devpost, Devfolio, MLH, ETHGlobal and others, collected automatically | No coaching and no personal fit. Its sources include sites whose terms forbid scraping; hackbrief collects only where terms allow ([sources.md](sources.md)). |
| [HackHQ](https://github.com/Hack-HQ/hackhq) | Daily-updated list, 3D globe, application tracker; MIT, 123 stars | Maintainer-approved submissions, extracted by a model | A list and a tracker; no fit score or coaching. A source for hackbrief, as leads. |
| [Hack Club Hackathons](https://hackathons.hackclub.com) | Curated high-school hackathons with a public API; MIT | Organiser submissions, reviewed | High-school only. A source for hackbrief, with credit. |
| [dev.events](https://dev.events) | Conferences, meetups and hackathons by region and topic; RSS | Submissions and monitoring | Broad events; no rules, criteria or coaching. |
| [Hackalist](https://www.hackalist.org) | Community JSON list | GitHub pull requests | No longer updated. |
| HackTrack-EU, hackathonist | European and Serbian lists, a Discord bot | Manual | One region each. |
| Hackathon Finder (Chrome extension), Eventio, hackathon-api, HackBot, the hackathon-aggregator Telegram bot, Apify actors | Merge listings from several platforms into one feed, bot or API | Scraping, including of sites whose terms forbid it | Listing only, and on a footing hackbrief will not use. They show the demand. |

## Coaches

| Product | What it does | How hackbrief differs |
| --- | --- | --- |
| [BULLSEYE](https://github.com/SaudSatopay/bullseye) | An agent playbook (12 skills) that "reads the rubric before it writes code", picks a problem for its chance of winning and builds the demo path first; MIT | The closest coaching idea, for coding agents. hackbrief does it for people, for any event, with the weights computed in code and tied to a finder. |
| [dontreadme](https://github.com/Jazztinn/dontreadme) | An agent skill that writes a README "mapped to the judging rubric" | One deliverable, not a whole strategy. |
| [HackPilotAI](https://hackpilotai.lovable.app) | A team workspace: planner, task board, AI mentor, a 0 to 100 "Readiness Score" | Not tied to the event's actual rubric; no finder. Operator unnamed. |
| [AgreMatch](https://github.com/Shrey-dev05/AgreMatch) | Matches a CV to opportunities scraped from three platforms | The only fit matcher found; tiny, and built on scraping. |
| Idea and pitch generators (CrewAI, Google's PitchHack, CodeWords templates) | Ideas and pitch decks from a theme | No rubric weighting. |

Organiser-side tools ([Devfolio's AI judge](https://devfolio.co/blog/the-discerning-machine/),
HackJudge-AI, hackathon-rubric-builder) score submissions for judges. Devfolio's post agrees with
hackbrief's design: a rubric is a specification with weights, applied in code, and "The decision stays
with the human panel".

## What wins hackathons: reading for the coach

The coach's advice is written from these. Items marked **not read** were blocked or seen only in
search results, and are to be read by hand before anything from them is quoted.

| Source | Takeaway |
| --- | --- |
| Nolte, Chounta and Herbsleb, "What Happens to All These Hackathon Projects?", Proc. ACM HCI 4, CSCW2, art. 145 (2020), [doi:10.1145/3415216](https://doi.org/10.1145/3415216) | A study of 78 Devpost hackathons on what keeps projects going afterwards; the main academic baseline. |
| [NASA Space Apps judging guide](https://www.spaceappschallenge.org/resources/judging-awards-guide) | Impact, creativity, validity, relevance and presentation, equally weighted: presentation counts as much as the build. |
| [lablab.ai, "How to Win an AI Hackathon"](https://lablab.ai/guide/how-to-win-an-ai-hackathon) | A focused problem, a working demo by hour 24, read the rubric, a crisp pitch, teams of 3 to 4, no pivots after hour 12. |
| [Devfolio, "The discerning machine"](https://devfolio.co/blog/the-discerning-machine/) (18 May 2026) | A good rubric has weights, examples and evidence; weights belong in code. |
| [BULLSEYE README](https://github.com/SaudSatopay/bullseye) | Read the rubric first, check the sponsor's technology is load-bearing, build the demo path first. |
| Google Solution Challenge FAQ (earlier years) | Impact and technology on a 1 to 50 scale; 2022 slides weigh impact 60, technology 40. |
| "How to Pick a Winning Hackathon Project?" (ResearchGate preprint) | **Not read**: per its summary, 6,352 submissions from 50 online hackathons, 2020 to 2024. |
| JetBrains AI blog, "How to win a hackathon: notes from the judging table" (June 2026) | **Not read** (blocked). |
| Devpost winner analyses (Medium, "Win the North") | **Not read** (blocked); per search snippets only. |
