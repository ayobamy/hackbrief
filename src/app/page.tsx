import Link from "next/link";

import { BriefPreview } from "@/components/brief-preview";
import { SiteFooter } from "@/components/site-footer";
import { REPOSITORY_URL, SiteHeader } from "@/components/site-header";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const PRIMARY = `inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 ${FOCUS}`;
const SECONDARY = `inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-3 text-sm font-medium hover:border-ink ${FOCUS}`;

const SOURCES = [
  { name: "Hack Club Hackathons", detail: "Public API, credited as Hack Club asks" },
  { name: "Hackster.io", detail: "Contests feed: title, link and sponsor" },
  { name: "HackHQ", detail: "Open list, organisers' own sites only" },
  { name: "Devpost", detail: "Asked for permission, never scraped" },
];

const STEPS = [
  {
    title: "Find",
    text: "Upcoming hackathons in one list, filtered by format and source, each linked to its own page and to where hackr found it.",
  },
  {
    title: "Read",
    text: "Paste any hackathon's rules. hackr pulls out the deadline, who can enter, the team size and exactly what to hand in.",
  },
  {
    title: "Plan",
    text: "The judging weights become where to spend your hours, and the deadline becomes a prep plan counted back day by day.",
  },
];

const PRINCIPLES = [
  {
    title: "Every number is computed",
    text: "Weights, dates and days left come from tested code. A language model may one day word a summary; it never makes up a figure.",
  },
  {
    title: "Terms before data",
    text: "hackr reads each site's terms before collecting anything, takes only what they allow, and credits every source.",
  },
  {
    title: "Private by default",
    text: "Rules you paste are read on the page, in your browser. Nothing is sent to a server, and there is no account to make.",
  },
  {
    title: "Open source",
    text: "MIT licensed and built in the open: the code, the decisions and the list of sources are all on GitHub.",
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b border-line">
          <div
            className="dot-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col gap-7">
              <p className={LABEL}>Open source · for students and early-career developers</p>
              <h1 className="text-5xl leading-[0.95] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Pick the right hackathon.
                <span className="block text-muted">Then play to win.</span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted">
                hackr lists hackathons from the sources that allow it, and turns any event&apos;s rules
                into a plan: when it closes, what to hand in, and where the judges&apos; points are.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/coach" className={PRIMARY}>
                  Paste a hackathon&apos;s rules
                  <Arrow />
                </Link>
                <Link href="/events" className={SECONDARY}>
                  Browse upcoming hackathons
                </Link>
              </div>
              <p className={LABEL}>No account · your text stays in your browser</p>
            </div>
            <BriefPreview />
          </div>
        </section>

        <section aria-labelledby="sources-heading" className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 id="sources-heading" className={`${LABEL} pt-10 pb-6`}>
              Listings only from sources whose terms allow it
            </h2>
            <ul className="mb-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {SOURCES.map((source) => (
                <li key={source.name} className="flex flex-col gap-1 bg-paper p-6">
                  <span className="font-medium">{source.name}</span>
                  <span className="text-sm text-muted">{source.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-b border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className={LABEL}>How it works</p>
              <h2 id="how-heading" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                From ten pages of rules to one page of plan.
              </h2>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-4 bg-panel p-7">
                  <span className="flex items-center gap-2 font-mono text-sm text-muted">
                    <span className="size-2 bg-accent" aria-hidden="true" />
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="leading-7 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="principles-heading" className="border-b border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className={LABEL}>What hackr promises</p>
              <h2 id="principles-heading" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Honest numbers, respected sources, your data left alone.
              </h2>
            </div>
            <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <li key={principle.title} className="flex flex-col gap-3 border-t border-ink pt-5">
                  <h3 className="text-lg font-semibold tracking-[-0.02em]">{principle.title}</h3>
                  <p className="leading-7 text-muted">{principle.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="bg-ink text-paper">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="cta-heading" className="max-w-2xl text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-5xl">
              Your next hackathon starts with the rules.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/coach"
                className={`inline-flex items-center gap-2 rounded-md bg-paper px-5 py-3 text-sm font-medium text-ink hover:opacity-90 ${FOCUS}`}
              >
                Open the coach
                <Arrow />
              </Link>
              <a
                href={REPOSITORY_URL}
                className={`inline-flex items-center gap-2 rounded-md border border-paper/30 px-5 py-3 text-sm font-medium hover:border-paper ${FOCUS}`}
              >
                Star it on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
