# MVP outline: Hackathon Scraper and Coach

Ahmed's outline for version 1, as written on 2 November 2026. [START-HERE](START-HERE.md) says
what has been decided since, and what changes because of Devpost's terms.

## 1. Define the core user and job

Start with one main persona so you don't explode scope: an early-career dev or student who wants
to participate in more hackathons and actually place.

Their core job: "Tell me which hackathons I should join and how to win them, without me reading
10 pages each time."

## 2. Data sources and scraping scope

For the MVP, don't try to scrape the whole internet. Pick 1–2 rich sources and go deep:

- Devpost (public hackathons, rules, judging criteria, past winners, submissions).
- One "secondary" source: MLH or a regional platform you know well.

From each event, extract structured fields:

- Basic: name, dates, location/online, organizer, prize, tracks/themes, tech requirements.
- Rules: eligibility, team size, deliverables, submission format, important deadlines.
- Judging criteria: rubrics, weights, examples (innovation, technical quality, usability, impact,
  etc.).
- Past winners: team name, project name, short description, stack, links (demo, GitHub, Devpost
  page).

Store all this in a normalized schema so you can query "show me AI hackathons that care most
about impact vs pure tech" later.

## 3. Core user flows

For the MVP, you really only need three main flows.

1. **Discover hackathons "for me"**
   - Simple onboarding: skills, tech stack, interests, time zone, preferred format
     (online/offline), experience level.
   - Screen listing: upcoming events ranked by "fit score" (based on stack, theme, prize type,
     experience).
2. **Deep-dive on a specific hackathon.** For each event page, the system shows a single,
   digestible brief:
   - Human-readable summary of what it's about, who can join, key dates, prize structure.
   - Collapsed view of judging criteria: "This hackathon cares most about X and Y. To score
     well, you must nail A, B, C."
   - Checklist: "To submit you need: repo link, 2–3 min video, slide deck, README with these
     sections…"
3. **Pattern analysis from past winners.** This is the differentiation. For each event (or
   platform-wide):
   - Show patterns like common stacks, domains (fintech, health), team sizes, type of UX (web,
     mobile), presence of video, etc.
   - A short "playbook" for that event type: "Winners usually… validate a real user story, show
     a working demo, explain impact with 2–3 concrete metrics, use the sponsor's API
     prominently, and have a clean landing page."

## 4. Intelligence layer: "how to win this specific hackathon"

Initially you don't need fancy models; combine structured data, simple heuristics and maybe an
LLM prompt. For a chosen hackathon, generate:

- A personalized prep plan: "Two weeks before: form team, pick track, read docs. 48h before: set
  up boilerplate, test APIs. During: prioritize core demo path, keep scope small, rehearse
  2-minute pitch."
- Strategy notes tied to judging rubrics. If the rubric weights "Technical quality 30%,
  Innovation 20%, Impact 25%, Presentation 25%", the coach says: "Spend more time on
  reliability, code clarity, and a smooth demo than building 5 extra features."

Over time: "Given your skills (React + Node + basic ML), here's a project idea likely to score
well for this hackathon."

## 5. Architecture and tech choices (high level)

Keep it simple for v1:

- Backend: one service that handles scraping, normalization, and the API for the frontend.
- Scraper workers: scheduled jobs hitting Devpost and other sources, respecting robots.txt and
  rate limits.
- Database: a relational DB with tables for Events, Tracks, Criteria, Submissions, Teams,
  TechStack, Users.
- Optional: an LLM API to summarize rules and generate "how to win" briefs from raw text.

## 6. MVP feature checklist

A concrete, shippable first version:

- User login and a basic profile (skills, interests).
- A daily or weekly scraper for 1–2 sources, writing into the DB.
- Event list with filters (date, online/offline, prize size, sponsor, tech theme).
- Event detail page with:
  - a unified overview (one short summary, not copy-pasted blocks);
  - parsed deadlines, rules and judging criteria;
  - a list of past winners with links, when available;
  - an auto-generated "how to score well here" section.
- A "For you" tab: a ranked list of the top N hackathons to join next.

Then iterate into notifications, team matching, project-idea generation and deeper analytics
once this core loop works and a few users rely on it.
