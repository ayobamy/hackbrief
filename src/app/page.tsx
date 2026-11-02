import Link from "next/link";
import { Suspense } from "react";

import {
  PlanPanel,
  ReadPanel,
  UpcomingPreview,
  UpcomingSkeleton,
} from "@/components/landing-panels";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { PlatformMarquee } from "@/components/platform-marquee";
import { RubricPlayground } from "@/components/rubric-playground";
import { RulesDemo } from "@/components/rules-demo";
import { SiteFooter } from "@/components/site-footer";
import { REPOSITORY_URL, SiteHeader } from "@/components/site-header";
import { StepRail } from "@/components/step-rail";
import { countByVerdict, PLATFORMS } from "@/lib/platforms/catalogue";
import { SOURCES } from "@/lib/sources";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const PRIMARY = `inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 ${FOCUS}`;
const SECONDARY = `inline-flex items-center gap-2 border border-line bg-panel px-5 py-3 text-sm font-medium transition-colors hover:border-ink ${FOCUS}`;
const H2 =
  "text-3xl leading-[1.05] font-semibold tracking-[-0.035em] sm:text-5xl";

const STEPS = [
  { id: "find", label: "Find" },
  { id: "read", label: "Read" },
  { id: "plan", label: "Plan" },
] as const;

const PRINCIPLES = [
  {
    title: "Every number is computed",
    text: "Weights, dates and days left come from tested code. A language model may one day word a summary; it never makes up a figure.",
  },
  {
    title: "Terms before data",
    text: "hackbrief reads each site's terms before collecting anything, takes only what they allow, and credits every source.",
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

const QUESTIONS = [
  {
    q: "Is hackbrief free?",
    a: "Yes. It is free, open source under the MIT licence, non-commercial, and needs no account.",
  },
  {
    q: "Where do the hackathons come from?",
    a: "From sources whose terms allow it: Hack Club's public API, Hackster's contests feed and HackHQ's open list (organisers' own sites only), imported once a day. More join as their terms allow; every listing links to its own page and credits its source.",
  },
  {
    q: "Does hackbrief keep the rules I paste?",
    a: "No. The coach reads them in your browser, on the page. Nothing is sent to a server or stored, and the code that does it is public.",
  },
  {
    q: "Is the advice written by AI?",
    a: "No. Today every part of the brief, from the weights to the plan, comes from tested code. If a language model is added later, it will only word facts the code has already worked out, and it will be labelled.",
  },
  {
    q: "What rules can it read?",
    a: "English rules as Markdown, tables or plain prose, with dates such as 2027-03-14, March 14, 2027 or 14th March 2027. Times are shown as written, not converted between time zones, and anything it could not find is listed for you to check.",
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function Home() {
  const counts = countByVerdict();
  const count = (verdict: (typeof counts)[number]["verdict"]) =>
    counts.find((entry) => entry.verdict === verdict)?.count ?? 0;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {/* Hero: the promise, then the coach itself, running. */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[860px]" aria-hidden="true" />
          <div className="hero-grain pointer-events-none absolute inset-x-0 top-0 h-[860px]" aria-hidden="true" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
            <div className="flex max-w-3xl flex-col gap-7">
              <p className={`${LABEL} rise-in`}>
                Open source · for students and early-career developers
              </p>
              <h1 className="rise-in text-5xl leading-[0.95] font-semibold tracking-[-0.05em] [animation-delay:80ms] sm:text-7xl lg:text-[5.5rem]">
                Pick the right hackathon.
                <span className="block text-muted">Then play to win.</span>
              </h1>
              <p className="rise-in max-w-xl text-lg leading-8 text-muted [animation-delay:160ms]">
                hackbrief lists hackathons from the sources that allow it, and turns
                any event&apos;s rules into a plan: when it closes, what to hand
                in, and where the judges&apos; points are.
              </p>
              <div className="rise-in flex flex-wrap gap-3 [animation-delay:240ms]">
                <Link href="/coach" className={PRIMARY}>
                  Paste a hackathon&apos;s rules
                  <Arrow />
                </Link>
                <Link href="/events" className={SECONDARY}>
                  Browse upcoming hackathons
                </Link>
              </div>
            </div>
            <div className="rise-in [animation-delay:320ms]">
              <RulesDemo />
            </div>
          </div>
        </section>

        {/* Every platform read, scrolling by. */}
        <section
          aria-labelledby="platforms-heading"
          className="border-b border-line py-14"
        >
          <div className="mx-auto mb-8 flex w-full max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <h2 id="platforms-heading" className={LABEL}>
              {PLATFORMS.length} platforms&apos; terms read before a single
              listing was collected
            </h2>
            <a
              href={`${REPOSITORY_URL}/blob/main/docs/platforms.md`}
              className={`${LABEL} underline underline-offset-4 hover:text-ink ${FOCUS}`}
            >
              See the full list
            </a>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <PlatformMarquee />
          </div>
        </section>

        {/* The problem, and the promise. */}
        <section
          aria-labelledby="problem-heading"
          className="border-b border-line"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <Reveal className="flex flex-col gap-4">
              <p className={LABEL}>
                The problem <span aria-hidden="true">→</span> the promise
              </p>
              <h2 id="problem-heading" className={H2}>
                The rubric is in paragraph nine. The deadline is in another time
                zone.
              </h2>
            </Reveal>
            <Reveal
              delay={120}
              className="flex flex-col gap-6 self-end text-lg leading-8 text-muted"
            >
              <p>
                Every hackathon hides what matters in its own rules page: who
                can enter, how big a team can be, what to hand in, and how the
                judges will score it. Most people skim, build the wrong thing
                well, and miss a required video.
              </p>
              <p className="text-ink">
                hackbrief reads the rules for you and hands back one page: the
                deadline counted down, the checklist, and the judging weights
                turned into where to spend your hours.
              </p>
            </Reveal>
          </div>
        </section>

        {/* How it works, as a story with a sticky rail. */}
        <section aria-labelledby="how-heading" className="border-b border-line">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <Reveal className="mb-16 flex max-w-2xl flex-col gap-4">
              <p className={LABEL}>How it works</p>
              <h2 id="how-heading" className={H2}>
                From ten pages of rules to one page of plan.
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[180px_minmax(0,1fr)]">
              <StepRail steps={STEPS} />
              <div className="flex flex-col gap-28">
                <article
                  id="find"
                  className="grid scroll-mt-28 grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
                >
                  <Reveal className="flex flex-col gap-3">
                    <span className="font-mono text-sm text-muted">01</span>
                    <h3 className="text-2xl font-semibold tracking-[-0.02em]">
                      Find
                    </h3>
                    <p className="leading-7 text-muted">
                      Upcoming hackathons in one list, filtered by format and
                      source, each linked to its own page and to where hackbrief
                      found it. Imported daily from {SOURCES.length} sources
                      whose terms allow it.
                    </p>
                    <Link
                      href="/events"
                      className={`${LABEL} mt-2 w-fit underline underline-offset-4 hover:text-ink ${FOCUS}`}
                    >
                      Browse the list
                    </Link>
                  </Reveal>
                  <Reveal delay={120}>
                    <Suspense fallback={<UpcomingSkeleton />}>
                      <UpcomingPreview />
                    </Suspense>
                  </Reveal>
                </article>
                <article
                  id="read"
                  className="grid scroll-mt-28 grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
                >
                  <Reveal className="flex flex-col gap-3">
                    <span className="font-mono text-sm text-muted">02</span>
                    <h3 className="text-2xl font-semibold tracking-[-0.02em]">
                      Read
                    </h3>
                    <p className="leading-7 text-muted">
                      Paste any hackathon&apos;s rules. hackbrief pulls out the
                      deadline, who can enter, the team size and exactly what to
                      hand in, and quotes the line each one came from.
                    </p>
                  </Reveal>
                  <Reveal delay={120}>
                    <ReadPanel />
                  </Reveal>
                </article>
                <article
                  id="plan"
                  className="grid scroll-mt-28 grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
                >
                  <Reveal className="flex flex-col gap-3">
                    <span className="font-mono text-sm text-muted">03</span>
                    <h3 className="text-2xl font-semibold tracking-[-0.02em]">
                      Plan
                    </h3>
                    <p className="leading-7 text-muted">
                      The deadline becomes a prep plan, counted back from the
                      day the hacking starts to the hour you submit, with the
                      finishing work your checklist asks for.
                    </p>
                  </Reveal>
                  <Reveal delay={120}>
                    <PlanPanel />
                  </Reveal>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* The rubric playground. */}
        <section
          aria-labelledby="playground-heading"
          className="border-b border-line"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
            <Reveal className="flex max-w-2xl flex-col gap-4">
              <p className={LABEL}>Try the strategy</p>
              <h2 id="playground-heading" className={H2}>
                Move the judging weights. Watch the advice change.
              </h2>
              <p className="text-lg leading-8 text-muted">
                This is the coach&apos;s own code: weights are scaled to whole
                percentages that add up to 100, and each criterion gets its
                focus.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <RubricPlayground />
            </Reveal>
          </div>
        </section>

        {/* The figures behind the promises. */}
        <section
          aria-labelledby="numbers-heading"
          className="border-b border-line"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="numbers-heading" className="sr-only">
              hackbrief in numbers
            </h2>
            {/* Hairline rules between the figures: one-pixel gaps over the line colour. */}
            <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  value: PLATFORMS.length,
                  label: "platforms whose terms were read",
                },
                { value: count("use"), label: "allow it, so hackbrief uses them" },
                { value: count("ask"), label: "asked for permission first" },
                { value: SOURCES.length, label: "sources imported every day" },
              ].map((figure) => (
                <li
                  key={figure.label}
                  className="flex flex-col gap-2 bg-paper p-7"
                >
                  <CountUp
                    value={figure.value}
                    className="text-5xl font-semibold tracking-[-0.04em]"
                  />
                  <span className="text-sm text-muted">{figure.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What hackbrief promises. */}
        <section
          aria-labelledby="principles-heading"
          className="border-b border-line"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
            <Reveal className="flex max-w-2xl flex-col gap-4">
              <p className={LABEL}>What hackbrief promises</p>
              <h2 id="principles-heading" className={H2}>
                Honest numbers, respected sources, your data left alone.
              </h2>
            </Reveal>
            <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {PRINCIPLES.map((principle, index) => (
                <li key={principle.title}>
                  <Reveal
                    delay={index * 80}
                    className="flex flex-col gap-3 border-t border-ink pt-5"
                  >
                    <h3 className="text-lg font-semibold tracking-[-0.02em]">
                      {principle.title}
                    </h3>
                    <p className="leading-7 text-muted">{principle.text}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Questions. */}
        <section aria-labelledby="faq-heading" className="border-b border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Reveal className="flex flex-col gap-4">
              <p className={LABEL}>Questions</p>
              <h2 id="faq-heading" className={H2}>
                Asked, and answered plainly.
              </h2>
            </Reveal>
            <div className="flex flex-col">
              {QUESTIONS.map((item) => (
                <details
                  key={item.q}
                  className="group border-b border-line py-5 first:border-t"
                >
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium ${FOCUS}`}
                  >
                    {item.q}
                    <span
                      className="text-xl text-muted transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pt-3 pr-10 leading-7 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* The close. */}
        <section
          aria-labelledby="cta-heading"
          className="relative overflow-hidden bg-ink text-paper"
        >
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-10 px-4 py-28 sm:px-6">
            <h2
              id="cta-heading"
              className="max-w-4xl text-5xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-7xl"
            >
              Your next hackathon starts with the rules.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/coach"
                className={`inline-flex items-center gap-2 bg-paper px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 ${FOCUS}`}
              >
                Open the coach
                <Arrow />
              </Link>
              <Link
                href="/events"
                className={`inline-flex items-center gap-2 border border-paper/30 px-5 py-3 text-sm font-medium transition-colors hover:border-paper ${FOCUS}`}
              >
                Browse hackathons
              </Link>
              <a
                href={REPOSITORY_URL}
                className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-80 ${FOCUS}`}
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
