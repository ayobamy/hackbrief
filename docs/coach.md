# The coach: from pasted rules to a plan

The coach is hackr's first feature (issue #4, data route D1 in [decisions.md](decisions.md)). A
user pastes a hackathon's rules and judging text at `/coach` and gets a brief:

- the submission deadline and how many days are left;
- the team size and whether solo entries are allowed;
- the judging criteria with their weights, and a strategy note for each;
- a submission checklist, each item quoted from the rules it came from;
- a prep plan counted back from the start and the deadline;
- the key dates, who can enter, and the prizes.

## Privacy

The text is read in the browser, on the page. It is not sent to hackr's server or to anyone else,
and it is not stored. A check in a real browser on 2 November 2026 confirmed that building a brief
makes no network request carrying the text.

## How each number is computed

Every figure comes from code in `src/lib/coach/`, covered by tests in the same folder. No
language model is involved.

| Figure | How |
| --- | --- |
| Criterion weights | Read as percentages or points. Points, and percentages that do not add up to 100, are scaled to whole percentages that add up to exactly 100 by the largest-remainder method: each share is rounded down and the points left over go to the largest fractions, earliest first. 15, 10, 10 and 5 points out of 40 become 38%, 25%, 25% and 12%. |
| Equal weights | When the judging section lists criteria without numbers, each gets an equal share, and the brief says the weights were not stated. |
| Focus, keep steady, light touch | The heaviest criterion and any at 25% or more are a focus; 10% or less is a light touch; the rest keep steady. |
| Days left | Whole calendar days from the viewer's own date to the deadline's date as written. |
| Deadline | The latest date marked as a submission date. |
| Team size | The first sentence about teams that states a size. A stated minimum of 1 allows solo entries and 2 or more rules them out; otherwise the brief follows what the rules say about entering alone, or says they do not mention it. |
| Top prize | The largest amount in each currency mentioned in a sentence about prizes or under a prizes heading. |
| Prep plan dates | Fixed offsets: 14 and 3 days before the start, the start, the day before the deadline and the deadline. Without a start date, the steps before the event count back from two days before the deadline. |

## What it reads

- **Layouts:** Markdown headings and lists, all-caps headings, tables pasted as text, and plain
  prose. The samples on the page cover one of each; they are fictional.
- **Dates:** `2027-03-14`, `March 14, 2027`, `14th March 2027`, ranges such as `March 12–14,
  2027` and `February 26 - March 7, 2027`, and times such as `11:59 PM PT` or `18:00 UTC`.
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

Plain-language summaries from a language model come later, through free OpenRouter models (D5),
and will only word what this code has already computed.
