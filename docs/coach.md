# The coach: from pasted rules to a plan

The coach is hackbrief's first feature (issue #4, data route D1 in [decisions.md](decisions.md)). A
user pastes a hackathon's rules and judging text at `/coach` and gets a brief:

- the submission deadline and how many days are left;
- the team size and whether solo entries are allowed;
- the judging criteria with their weights, and a strategy note for each;
- a submission checklist, each item quoted from the rules it came from;
- a prep plan counted back from the start and the deadline;
- the key dates, who can enter, and the prizes.

## Privacy

The text is read in the browser, on the page. It is not sent to hackbrief's server or to anyone else,
and it is not stored. A check in a real browser on 2 November 2026 confirmed that building a brief
makes no network request carrying the text.

## Opening the coach from a listing

Each card on `/events` opens the event's own page, `/events/<id>` (issue #62): **Open the brief** when
its brief is stored, **Build my brief** otherwise. The page opens on the brief, facts first with their
sources; its link "Paste its rules into the coach" opens `/coach?event=<id>` (issue #31, decision
D10). The coach then shows what the list knows about that hackathon (its name, dates, format, place
and who listed it), a link to its own page to copy the rules from, and the paste box; the brief is
titled with the event. The id is checked to be a well-formed UUID before it reaches the database
(`src/lib/events/context.ts`), and any other value gives the plain coach.

Since issue #41 (decision D11) the server also reads that hackathon's own page, and up to two
same-site pages whose path names its rules, FAQ or judging. When the coach finds anything in them
(a deadline, criteria, a team size, who can enter, something to hand in or a prize), it fills the
box and builds the brief at once, and says which pages it read; anything still missing can be
pasted in. When it finds nothing, or may not read the page, it says why and asks for a paste as
before. If the visitor has already started typing, their text is left alone. How the page is read
is in [sources.md](sources.md#reading-an-events-own-page).

The router keeps a page it leaves hidden rather than unmounted (React's Activity, with Cache
Components), so the coach clears its box, link and brief itself when it is opened for a different
event, and keeps them when it is opened for the same one again (issue #55).

Since issue #51 a brief opened from a listing also uses the listing's own dates where the rules give
none (`src/lib/coach/listing.ts`). A deadline written as a weekday, such as "submitted by 9 AM on
Sunday", goes on the listing's only Sunday; without one, the event's last day on its own page stands
in for the deadline (#76: the organiser's page is the better word when the listing disagrees), and
without that, the listing's first and last days stand in for the start and the deadline, labelled
"from its page" or "from the listing" and warned about under "Check these",
so the countdown and the prep plan still work. Dates taken from the listing never count as found in
the rules.

For a hackathon hackbrief does not list, an optional field takes the link to its page. The link
only labels the brief and links back; hackbrief never opens or reads it, and it stays in the
browser like the pasted text. Only the event id of a listed event goes to the server, to look the
event up.

## How each number is computed

Every figure comes from code in `src/lib/coach/`, covered by tests in the same folder. No
language model computes a figure; a model may only point to the sentences they are read from (see
"Facts a model points to" below).

| Figure | How |
| --- | --- |
| Criterion weights | Read as percentages or points. Points, and percentages that do not add up to 100, are scaled to whole percentages that add up to exactly 100 by the largest-remainder method: each share is rounded down and the points left over go to the largest fractions, earliest first. 15, 10, 10 and 5 points out of 40 become 38%, 25%, 25% and 12%. |
| Equal weights | When the judging section lists criteria without numbers, each gets an equal share, and the brief says the weights were not stated. |
| Focus, keep steady, light touch | The heaviest criterion and any at 25% or more are a focus; 10% or less is a light touch; the rest keep steady. |
| Days left | Whole calendar days from the viewer's own date to the deadline's date as written. |
| Deadline | The latest date marked as a submission date. Priority, early-bird and registration deadlines are for applying, so they never count. For a listed event whose rules give none, a weekday deadline on the listing's matching day, else the event's last day on its own page, else the listing's last day, marked as such. |
| Team size | The first sentence about teams that states a size. A stated minimum of 1 allows solo entries and 2 or more rules them out; otherwise the brief follows what the rules say about entering alone, or says they do not mention it. |
| Top prize | The largest amount in each currency mentioned in a sentence about prizes or under a prizes heading. |
| Prep plan dates | Fixed offsets: 14 and 3 days before the start, the start, the day before the deadline and the deadline. Without a start date, the steps before the event count back from two days before the deadline. |

## What it reads

- **Layouts:** Markdown headings and lists, all-caps headings, tables pasted as text, and plain
  prose. The samples on the page cover one of each; they are fictional.
- **Dates:** `2027-03-14`, `March 14, 2027`, `14th March 2027`, ranges such as `March 12–14,
  2027` and `February 26 - March 7, 2027`, and times such as `11:59 PM PT` or `18:00 UTC`.
- **Where to submit:** "submit on Devpost" or "submit your game on itch.io" adds "Submit on …" to the
  checklist, for a fixed list of platforms, so "submit on our website" adds nothing.
- **Section context:** a line under a "Prizes" heading is read as a prize, one under "What to
  submit" as a deliverable, and words like "students" count towards eligibility only under an
  eligibility heading.

## Limits

- **English only,** and pattern-based: unusual wording can be missed. The brief lists what it could
  not find or had to assume, under "Check these".
- **Time zones are not converted.** A deadline of `11:59 PM PT` is shown as written; days left are
  counted by date, so near the deadline check the time yourself.
- **Dates without a year** get this year, or next year if that date is more than 30 days past, and
  are marked "year assumed".
- **Text longer than 100,000 characters** is cut, and the brief says so.

## Facts a model reads

When "Build my brief" reads a listed hackathon's pages, a language model reads them too and gives
every fact of the brief with the sentence, or two, it rests on (decision D13,
`src/lib/coach/fill.ts`):

- **More pages.** Besides the listed page and the rules links this code finds, the model picks up
  to three more of the site's own pages from its links (`choose.ts`), including a rules PDF; each
  is read under the same rules: same site, robots.txt, size limits, never a restricted platform.
- **Checked by code.** A fact is kept only when each of its sentences is in the pages' text, after
  evening out spaces and curly quotes, and this code reads the same value from them: the deadline's
  date and time with the date rules above (read from the start of its sentence, so "Priority
  deadline October 3" is an application date, not the deadline), the team size, the judging weights
  (one wrong weight drops the model's judging), track names and prize amounts. Two sentences are
  allowed only when the second closely follows the first, as a schedule's line follows its day.
- **The model's checked facts come first;** this code's own reading fills whatever the model did
  not find, and a different deadline found by this code is shown as a warning. Facts are checked
  again against the box each time the brief is rebuilt, so editing them out of the text removes them.
- **Labelled.** The brief lists the facts a model read under "Check these", and the coach says a
  model read the page. Rules a visitor pastes are never sent to a model.
- **The playbook.** The model's instructions are the hackathon-reading playbook (`playbook.ts`):
  what to find, how organisers phrase it, and what is not a deadline. Each change to it, or to the
  model, is scored on fictional test pages (`eval/`, `pnpm exec tsx scripts/score-fill.ts`).

The request goes to OpenRouter (by default `anthropic/claude-haiku-5.5`, only on endpoints that
keep no data), then to Requesty if OpenRouter fails, each only when its key is set; without one, or
when both fail, the brief is this code's alone. A listed event's brief is built by the daily import
and stored as facts (`event_briefs`, #60), so it opens at once; the coach turns the stored facts
into the brief for the day it is opened.
