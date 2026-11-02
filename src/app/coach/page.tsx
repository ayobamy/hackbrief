import type { Metadata } from "next";
import Link from "next/link";

import { Coach } from "./coach";

export const metadata: Metadata = {
  title: "Coach · hackr",
  description:
    "Paste a hackathon's rules and judging criteria; get the key dates, a submission checklist and a strategy weighted by the rubric.",
};

export default function CoachPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="w-fit text-sm font-medium text-zinc-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-zinc-400"
        >
          hackr
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Paste the rules, get a plan</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Paste a hackathon&apos;s rules and judging criteria. hackr pulls out the dates, who can
          enter and what to submit, and turns the judging weights into where to spend your time.
        </p>
      </header>
      <Coach />
    </main>
  );
}
