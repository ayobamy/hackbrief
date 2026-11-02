# Data sources

Which sites hackr may collect hackathon data from, on what terms, and whom to ask for the rest.
CLAUDE.md rule 5 applies: nothing is collected from a site until its terms and robots.txt are read
and recorded here. The full catalogue of platforms is in [platforms.md](platforms.md); this page
is the register of what hackr does with them.

All pages were read on 2 November 2026. Rows marked **re-checked** were read again by hand that day
against the live page, with the quoted words confirmed; the others come from the research pass
the same day and are to be re-read before hackr relies on them.

## How hackr treats a source

1. **Terms first.** Terms of service override robots.txt. A site whose terms forbid automated
   access or reuse is not collected without written permission, whatever robots.txt allows.
2. **Official channels only.** Where a site offers an API, a feed or an open data file, hackr
   uses that and nothing else.
3. **Identify, rate-limit, cache.** Requests carry the user agent
   `hackr/<version> (+https://github.com/ayobamy/hackr)`, go no faster than one a second per site
   (slower where robots.txt sets a crawl delay), run at most once a day, and are cached.
4. **Stop on a block.** A captcha, a firewall page or a 403 ends collection from that site until a
   person has looked. Blocks are never worked around.
5. **Attribute and link back.** Every event shows where it came from, with a link to the source's
   own page, and follows any attribution the source asks for.
6. **Facts, not copies.** hackr stores the facts it needs (name, dates, place, format, link,
   prizes, judging weights) and its own summaries, not copied descriptions.

## Use now

| Source | What hackr gets | Channel | Conditions | Status |
| --- | --- | --- | --- | --- |
| [Hack Club Hackathons](https://hackathons.hackclub.com/data) | High-school hackathons worldwide: name, start, end, city, country, virtual or hybrid, website (14 upcoming on 2 November) | JSON API: `/api/events/upcoming`, `/api/events/all` | "If you use it, you must credit “Hack Club Hackathons” with a link". Use the documented API only: the backend host's robots.txt is `Disallow: /`. Site code is MIT. | Re-checked |
| [Kaggle](https://www.kaggle.com/docs/api) | Data-science and ML competitions: title, deadline, category, reward, team count | Official API and CLI, free account token; client is Apache-2.0 ([kaggle-cli](https://github.com/Kaggle/kaggle-cli)) | The website terms ban crawling "through use of manual or automated means", so never read the site itself. The terms page renders only in a browser and was read once through a text renderer: re-read it in a browser. | Client licence re-checked |
| [Hackster.io contests](https://www.hackster.io/contests.atom) | Hardware and IoT contests run by sponsors (3 entries on 2 November) | Atom feed `/contests.atom` | The terms say nothing about automated access; the feed is published for readers. Use the feed's title, link and dates only, and ask Hackster before showing more. Contest pages returned 403 to an automated read. | Feed re-checked |
| [NASA Space Apps](https://www.spaceappschallenge.org/legal/) | Past challenges, winners and their projects: the best licensed source for past-winner patterns | Public pages, slowly; robots.txt allows `/` and blocks `/private/` and `/api/` | Entrants' original content must be "freely available without restriction or ... licensed as open source"; "If you do not specify a specific OSI compliant license, NASA will distribute your original content under an Apache 2.0 license." Ask NASA for a bulk export before crawling. | Re-checked |
| [DrivenData winners](https://github.com/drivendataorg/competition-winners) | Code and write-ups of prize-winning solutions to social-impact ML competitions | GitHub repository (MIT index of winners' repositories) | Use GitHub only: the DrivenData site's terms ban "any robot, spider or other automatic device". Check each winner's own licence. | Licence re-checked |
| [Hackalist](https://github.com/Hackalist/Hackalist.github.io) | Older hackathon listings by month | Static JSON `/api/1.0/YEAR/MONTH.json` | "The API is public, so feel free to use it for your own projects." But "This site is no longer actively updated": history only, not current events. | Re-checked |
| [HackHQ](https://github.com/Hack-HQ/hackhq) | A daily-updated list, mainly North American student hackathons | `listings.json` in an MIT repository | MIT. Its entries are extracted by a model from organisers' and Devpost pages, so treat them as leads: confirm each against the organiser's own site, and do not import text that came from Devpost. | Licence re-checked |

## Usable with care

- **[Doorkeeper](https://www.doorkeeper.jp/developer/api?locale=en)** (Japan): a public API with a
  token. Displayed events "must include and display a link to the event webpage associated with
  that event on Doorkeeper", without `nofollow`, and "You shall not use the Doorkeeper APIs in, or
  to develop, a product or service that competes with products or services offered by Doorkeeper."
  Ask Doorkeeper whether hackr counts as competing before using it. Re-checked.
- **[Eventbrite](https://www.eventbrite.com/platform/api)**: the API returns events only for an
  organiser, venue or series ID hackr already knows; Eventbrite's support article says public event
  search ended on 12 December 2019 (not re-read). Its terms (13.1) ban scraping, and the API terms
  limit storage and display. Little value for discovery.

## Ask permission

These sites hold useful listings, rules or winners, but their terms forbid collection, say nothing
about it, or put their API behind a paid plan. hackr links to them and asks before collecting.

| Source | Why ask | Contact |
| --- | --- | --- |
| Devpost | Terms forbid scraping (s.4) and reuse without written consent (s.7A); organisers own their hackathon text (s.7B), so organisers are a second route | `support@devpost.com`; draft in [outreach/devpost.md](outreach/devpost.md) |
| MLH | Terms limit use to "personal purposes and non-commercial use" | Contact form on mlh.com |
| Devfolio | Terms are silent; no public API | `hello@devfolio.co` |
| ETHGlobal | No website terms; "All rights reserved"; 14,000+ showcase projects with prize badges | `hello@ethglobal.com` |
| lablab.ai | Terms ban scripts that capture data; judging criteria and submissions are public | `support@lablab.ai` |
| Zindi | African data-science competitions; terms ban copying site material | `zindi@zindi.africa` |
| Colosseum | Terms ban automated collection; Copilot API needs an account | `hello@colosseum.com` |
| HackQuest (with BuidlBox) | Licence is personal and non-commercial; bans automated scraping | `founder@hackquest.io` |
| TAIKAI | Terms (s.10.C) ban extracting "a substantial part of the data" with robots, despite a public GraphQL API | `hello@taikai.network` |
| Agorize | Terms (s.9.B) say the same as TAIKAI's | `contact@agorize.com` |
| Encode Club | No website-use terms | `info@encode.club` |
| AIcrowd | Terms ban spidering, scraping and deep links | `hello@aicrowd.com` |
| DrivenData (listings) | Terms ban robots | `info@drivendata.org` |
| Hackathon.com | Terms ban reuse "for commercial purposes or for personal gain" | `support@hackathon.com` |
| HackerEarth | Terms bar reproducing others' content and building competing products | `support@hackerearth.com` |
| Hack2skill | No automated-access clause found | `info@hack2skill.com` |
| Unstop | Terms not readable without a browser; robots.txt allows `/api/public/*`, undocumented | Contact page on unstop.com |
| Superteam Earn | Keeps rights in its "information and data"; its agent API is for work, not listings | Contact page on superteam.fun |
| Luma, Meetup | APIs need a paid plan (Luma Plus, Meetup Pro) or cover only your own events | Their developer pages |
| connpass, Peatix, KonfHub, Allevents, dev.events, Opportunity Desk | Terms ban redistribution or say nothing; dev.events has an RSS feed with no licence | Each site's contact page |

## Link out only

hackr may store what a user enters about these and link to them, but collects nothing:
BeMyApp, Google Developer Groups (Bevy), Junction, HackZurich, Microsoft Imagine Cup, Google
Solution Challenge, Smart India Hackathon, Sympla, tech.africa, Startup Map Hub, the Africa's
Talking developer community, and African government challenge pages. DoraHacks and Smart India
Hackathon blocked automated reads; Imagine Cup returned 403.

## Do not collect

- **Devpost**, until it gives written permission.
- **AngelHack**: clauses 3.3.2.10 and 3.3.2.11 forbid building a database by systematic download
  and gathering content automatically.
- **Gitcoin**: its terms ban "data mining, robots, scraping", and its hackathons moved elsewhere.

## Still to check

- Kaggle's website terms, in a browser.
- Terms pages that need a browser: Unstop, Hack2skill, Allevents, Junction, Meetup, AKINDO.
- Thin coverage of Latin America and Asia, and no single African calendar: African hackathons are
  announced one event at a time, so the organiser-submission route (D in START-HERE) matters there.
