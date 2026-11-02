# Data sources

Which sites hackbrief may collect hackathon data from, on what terms, and whom to ask for the rest.
CLAUDE.md rule 5 applies: nothing is collected from a site until its terms and robots.txt are read
and recorded here. The full catalogue of platforms is in [platforms.md](platforms.md); this page
is the register of what hackbrief does with them.

All pages were read on 2 November 2026. Rows marked **re-checked** were read again by hand that day
against the live page, with the quoted words confirmed; the others come from the research pass
the same day and are to be re-read before hackbrief relies on them.

## How hackbrief treats a source

1. **Terms first.** Terms of service override robots.txt. A site whose terms forbid automated
   access or reuse is not collected without written permission, whatever robots.txt allows.
2. **Official channels only.** Where a site offers an API, a feed or an open data file, hackbrief
   uses that and nothing else.
3. **Identify, rate-limit, cache.** Requests carry the user agent
   `hackbrief/<version> (+https://github.com/ayobamy/hackbrief)`, go no faster than one a second
   per site (slower where robots.txt sets a crawl delay), run at most once a day, and are cached.
4. **Stop on a block.** A captcha, a firewall page or a 403 ends collection from that site until a
   person has looked. Blocks are never worked around.
5. **Attribute and link back.** Every event shows where it came from, with a link to the source's
   own page, and follows any attribution the source asks for.
6. **Facts, not copies.** hackbrief stores the facts it needs (name, dates, place, format, link,
   prizes, judging weights) and its own summaries, not copied descriptions.

## Reading an event's own page

Decision D11 (issue #41): when a visitor clicks **Build my brief** on a listing, hackbrief reads that
hackathon's own page for them, so the brief can be built at once. The bounds:

- **Listed events only.** The address comes from hackbrief's database, never from what a visitor
  types; the coach's optional link field is a label and is never fetched.
- **Restricted platforms are never read.** That covers every platform under "Ask permission" and "Do
  not collect" below (`src/lib/sources/restricted.ts`), and Hackster's contest pages, whose feed
  alone is used. A redirect to one of them stops the read.
- **robots.txt is obeyed** for the user agent `hackbrief` (RFC 9309): a missing file allows reading,
  a server error forbids it.
- **The fetch is hardened** (`src/lib/rules/`). Only http(s) is read. Every connection must reach a
  public IP address: the DNS answer is checked as the connection is made, and an address written as
  an IP is checked before. Redirects are followed by hand (at most 3) and checked like the first
  request. Each request has an 8-second limit, at most 2 MB is read, and only HTML or plain text is
  used.
- **One page plus at most two.** The event's page, and at most two pages on the same site whose path
  names its rules, FAQ, judging, criteria or guidelines.
- **Cached for hours, never stored.** The result sits in the server's cache for hours, so an
  organiser's site sees at most a few requests a day; nothing is written to the database. The text
  is shown to the visitor who asked, in the coach's box, and the brief keeps facts, not copies.

Unlike a source in the tables below, an organiser's own site is not checked against its terms
first: hackbrief reads it once on a visitor's behalf, the way their browser would, identified by its
user agent. A site that objects can disallow `hackbrief` in its robots.txt, and it is no longer read.

## Use now

| Source | What hackbrief gets | Channel | Conditions | Status |
| --- | --- | --- | --- | --- |
| [Hack Club Hackathons](https://hackathons.hackclub.com/data) | High-school hackathons worldwide: name, start, end, city, country, virtual or hybrid, website (14 upcoming on 2 November) | JSON API: `/api/events/upcoming`, `/api/events/all` | "If you use it, you must credit “Hack Club Hackathons” with a link". Use the documented API only: the backend host's robots.txt is `Disallow: /`. Site code is MIT. | Re-checked |
| [Kaggle](https://www.kaggle.com/docs/api) | Data-science and ML competitions: title, deadline, category, reward, team count | Official API and CLI, free account token; client is Apache-2.0 ([kaggle-cli](https://github.com/Kaggle/kaggle-cli)) | The website terms ban crawling "through use of manual or automated means", so never read the site itself. The terms page renders only in a browser and was read once through a text renderer: re-read it in a browser. | Client licence re-checked |
| [Hackster.io contests](https://www.hackster.io/contests.atom) | Hardware and IoT contests run by sponsors (3 entries on 2 November) | Atom feed `/contests.atom` | The terms say nothing about automated access; the feed is published for readers. Use the feed's title, link and dates only, and ask Hackster before showing more. Contest pages returned 403 to an automated read. | Feed re-checked |
| [NASA Space Apps](https://www.spaceappschallenge.org/legal/) | Past challenges, winners and their projects: the best licensed source for past-winner patterns | Public pages, slowly; robots.txt allows `/` and blocks `/private/` and `/api/` | Entrants' original content must be "freely available without restriction or ... licensed as open source"; "If you do not specify a specific OSI compliant license, NASA will distribute your original content under an Apache 2.0 license." Ask NASA for a bulk export before crawling. | Re-checked |
| [DrivenData winners](https://github.com/drivendataorg/competition-winners) | Code and write-ups of prize-winning solutions to social-impact ML competitions | GitHub repository (MIT index of winners' repositories) | Use GitHub only: the DrivenData site's terms ban "any robot, spider or other automatic device". Check each winner's own licence. | Licence re-checked |
| [Hackalist](https://github.com/Hackalist/Hackalist.github.io) | Older hackathon listings by month | Static JSON `/api/1.0/YEAR/MONTH.json` | "The API is public, so feel free to use it for your own projects." But "This site is no longer actively updated": history only, not current events. | Re-checked |
| [HackHQ](https://github.com/Hack-HQ/hackhq) | A daily-updated list, mainly North American student hackathons | `listings.json` in an MIT repository | MIT. Its entries are extracted by a model from organisers' and Devpost pages, so treat them as leads: confirm each against the organiser's own site, and do not import text that came from Devpost. | Licence re-checked |

### Added in the second research pass (issue #14)

| Source | What hackbrief gets | Channel | Conditions | Status |
| --- | --- | --- | --- | --- |
| [OpenAgenda](https://developers.openagenda.com/en/) | Event agendas across France, the EU and Switzerland, including hackathons | Free REST API, needs a key | Terms (updated 14 October 2026): events on a public agenda "sont diffusées sous la Licence Ouverte 2.0 (Etalab)" and reusable "y compris à des fins commerciales, à la condition d'en mentionner la source". Credit each agenda's organisation. | Re-checked |
| [Jugend hackt](https://jugendhackt.org/kalender/) | Youth hackathons and labs in Germany, Austria and Switzerland | WordPress feeds | "Die Inhalte dieser Webseite sind, sofern nicht anders angegeben, nach Creative Commons 4.0 Attribution lizenziert" (CC BY 4.0, unless stated otherwise). Events are for ages 12 to 18: label them. | Re-checked |
| [CASSINI Hackathons](https://www.cassini.eu/hackathons) | The EU Space Programme's hackathons, one edition at a time across about ten cities | Public pages | "downloading, reproduction and use of all the materials and documents published on the Website are authorised provided the source is acknowledged as follow: © EUSPA 2026", except third-party material. | Re-checked |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | Facts about well-known hackathons (dates, organisers, websites): 262 items, few upcoming, so for filling in details rather than discovery | SPARQL endpoint `query.wikidata.org` | Structured data is CC0. Send a User-Agent naming hackbrief with a contact, and keep within the query service's limits. | Licence re-checked |
| [dribdat/awesome-hackathon](https://github.com/dribdat/awesome-hackathon) | A CC0 list of hackathon platforms and tools: leads for new sources, not events | GitHub | CC0-1.0. | From research |

**With care, from the second pass** (from research; re-read before building on them):

- **USA.gov active challenges** (14 on 2 November 2026): US federal prize competitions; federal
  works are public domain (17 U.S.C. §105); robots.txt asks for a 10-second crawl delay.
  Challenge.gov itself closed on 30 March 2026.
- **GOV.UK Search API** (`gov.uk/api/search.json`): no key, Open Government Licence v3.0, but mostly
  news pages, so low precision.
- **Hugging Face hackathon organisations**: the Hub API (500 anonymous requests per 5 minutes);
  rules and prizes sit in each organisation's README.
- **ProtoPedia** (Japan): an official API with a self-service token; its terms load only in a
  browser and must be read first.
- **MIT-licensed lists of past projects and winners**: unicorn-mafia/awesome-hackathon-winners and
  Olanetsoft/awesome-hackathon-projects (both to inspect before use); mbiesiad/awesome-hackathons
  is stale (May 2024).

## What the daily import reads

Built in issue #10: `src/lib/sources/` holds one adapter per source and `/api/cron/import` runs
them once a day. The first real run, on 2 November 2026, saved 52 listings as 51 events (one
hackathon was listed twice and merged):

| Source | Listings fetched | Saved | Left out |
| --- | --- | --- | --- |
| Hack Club Hackathons | 14 | 14 | 0 |
| Hackster.io contests | 3 | 3 | 0 |
| HackHQ | 238 | 35 | 203: ended, or taken from a platform that says ask first |

- **HackHQ** entries are kept only when their origin is an organiser's site, Hack Club or one of
  HackHQ's contributors, and their link is not on a platform listed under "Ask permission" or "Do
  not collect" below (`src/lib/sources/restricted.ts`). Its entries from Devpost, MLH, Luma and
  lablab.ai are never imported.
- **Hackalist** is not imported: its newest file is from March 2025, so it has no current events.
- **Jugend hackt** is not imported yet. Checked on 2 November 2026: its `wp-json/wp/v2/event`
  entries are write-ups of past events with no date fields, and its calendar feed lists weekly
  open labs rather than hackathons and names individual authors. Revisit when its 2027 events are
  announced.
- **Kaggle** joins once there is an API token; **NASA Space Apps** and **DrivenData** winners join
  with the past-winner patterns (M6 in [implementation-plan.md](implementation-plan.md)).

## Usable with care

- **[Doorkeeper](https://www.doorkeeper.jp/developer/api?locale=en)** (Japan): a public API with a
  token. Displayed events "must include and display a link to the event webpage associated with
  that event on Doorkeeper", without `nofollow`, and "You shall not use the Doorkeeper APIs in, or
  to develop, a product or service that competes with products or services offered by Doorkeeper."
  Ask Doorkeeper whether hackbrief counts as competing before using it. Re-checked.
- **[Eventbrite](https://www.eventbrite.com/platform/api)**: the API returns events only for an
  organiser, venue or series ID hackbrief already knows; Eventbrite's support article says public event
  search ended on 12 December 2019 (not re-read). Its terms (13.1) ban scraping, and the API terms
  limit storage and display. Little value for discovery.

## Ask permission

These sites hold useful listings, rules or winners, but their terms forbid collection, say nothing
about it, or put their API behind a paid plan. hackbrief links to them and asks before collecting.

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
| Topcoder | A public, unauthenticated challenges API (v6) but no data licence; paid challenges rather than hackathons | `support@topcoder.com` |
| WhereUElevate (India) | Terms allow personal, non-commercial viewing only | `care@wuelev8.tech` |
| TECH PLAY (Japan), Wevity and Contest Korea (South Korea), infolomba.id (Indonesia), Techcareer.net and TEKNOFEST (Turkey), Eventos de IA (Latin America), Garage48 (Baltics), Hackathons UK, allhackathons.com, MEST (Ghana) | Listings worth having; terms forbid reuse without permission, say nothing, or are missing | Each site's contact page |

## Link out only

hackbrief may store what a user enters about these and link to them, but collects nothing:
BeMyApp, Google Developer Groups (Bevy), Junction, HackZurich, Microsoft Imagine Cup, Google
Solution Challenge, Smart India Hackathon, Sympla, tech.africa, Startup Map Hub, the Africa's
Talking developer community, and African government challenge pages. DoraHacks and Smart India
Hackathon blocked automated reads; Imagine Cup returned 403.

From the second pass: Linkareer, Dicoding, Eventpop, Youthall, Wamda, Get on Board, Shawee,
Hackathon Lovers, EU Code Week, Create With, AfriLabs, iHub, CcHub, Opportunities for Africans,
After School Africa, Youth Opportunities, EIC Prizes, Impact Canada, GovHack, IBM Call for Code,
Reskilll, Bountycaster, sponsor hubs (AWS, Google, Microsoft) and blockchain ecosystems (Chainlink,
Polkadot, NEAR, Base, Hedera, Stellar, Cardano, Sui Overflow, Avalanche). DACON, Crossweb,
Techpoint Africa and Layer3 blocked automated reads.

## Do not collect

- **Devpost**, until it gives written permission.
- **AngelHack**: clauses 3.3.2.10 and 3.3.2.11 forbid building a database by systematic download
  and gathering content automatically.
- **Gitcoin**: its terms ban "data mining, robots, scraping", and its hackathons moved elsewhere.
- **From the second pass**, terms that forbid automated collection or reuse: Tianchi and
  Huodongxing (China), Accupass (Taiwan), Coderspace (Turkey), Even3 (Brazil), MyGov Innovate
  (India), HackerRank, CodeChef, Questbook, Replit (bounties discontinued), and datasets built by
  scraping Devpost.

## Still to check

- Kaggle's website terms, in a browser.
- Terms pages that need a browser: Unstop, Hack2skill, Allevents, Junction, Meetup, AKINDO.
- Thin coverage of Latin America and Asia, and no single African calendar: African hackathons are
  announced one event at a time, so the organiser-submission route (D in START-HERE) matters there.
