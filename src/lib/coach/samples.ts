/**
 * Fictional hackathon rules for trying the coach and for its tests. The events, organisers and
 * sponsors are invented; each sample uses a different format, as real rules do.
 */
export interface Sample {
  id: string;
  name: string;
  text: string;
}

const markdownPercent = `# Lagoon Build Weekend 2027

Organised by the Lagoon Dev Collective. A 48-hour online hackathon for builders of tools that help small businesses.

## Eligibility
Open to students and early-career developers aged 18 or over. Employees of the organisers are not eligible.

## Teams
Teams of up to 4 members. Individuals are welcome too.

## Key dates
- Registration closes: 2027-03-05
- Hacking starts: 2027-03-12 18:00 UTC
- Submission deadline: 2027-03-14 18:00 UTC
- Winners announced: 2027-03-20

## Judging criteria
- Technical quality (30%): does it work, and is the code clear?
- Innovation (20%): is the idea new?
- Impact (25%): would a small business use it?
- Presentation (25%): is the demo clear?

## What to submit
- A link to a public GitHub repository with a README.
- A demo video of no more than 3 minutes.
- A short slide deck.

## Prizes
- First place: $3,000
- Second place: $1,500
- Best use of open data: $500
`;

const shoutedPoints = `HARBOUR LIGHT CLIMATE HACK — OFFICIAL RULES

Hosted by Harbour Light Labs.

ELIGIBILITY
Participants must be at least 18 years old at the time of entry. The hackathon is open to residents of any country except where prohibited by law.

TEAM FORMATION
Team size: 2-5 people. Solo entries are not accepted.

SCHEDULE
Registration opens Monday, January 18, 2027.
Hacking period: February 26 - March 7, 2027
Submissions are due March 7, 2027 at 11:59 PM PT.
Judging: March 8 - 19, 2027
Winners will be announced on March 24, 2027.

JUDGING
Projects are scored out of 40 points:
| Criterion | Points |
| Impact on emissions | 15 points |
| Technical execution | 10 points |
| Use of the Harbour Light API | 10 points |
| Design and usability | 5 points |

SUBMISSION REQUIREMENTS
Each team must provide a project description, a list of technologies used, a link to a working demo, and a demo video (2-4 minutes, uploaded to YouTube or Vimeo). Projects must use the Harbour Light API.

PRIZES
Grand prize: USD 8,000. Runner-up: USD 4,000. Best student team: USD 1,000.
`;

const prose = `Kestrel Health Sprint 2027

The Kestrel Foundation invites students and recent graduates to build open tools for community clinics. Anyone aged 16 or older may enter, from any country.

You can take part on your own or in a team of up to three people.

The sprint runs from 9th April 2027 to 11th April 2027, and the final submission deadline is 11 April 2027 at 17:00 UTC. Registration is open until 2nd April.

Judges will score projects on impact (40 percent), technical execution (30 percent) and creativity (30 percent).

To enter, submit your code in a public repository under an open-source licence, a README that explains how to run it, and a link to a deployed demo. Finalists will present live to the judges on 24th April.

The winning team receives £2,000 and mentoring from clinic partners.
`;

export const SAMPLES: readonly Sample[] = [
  { id: "lagoon", name: "Lagoon Build Weekend", text: markdownPercent },
  { id: "harbour", name: "Harbour Light Climate Hack", text: shoutedPoints },
  { id: "kestrel", name: "Kestrel Health Sprint", text: prose },
];
