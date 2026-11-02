import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EventList } from "./event-list";

export const metadata: Metadata = {
  title: "Upcoming hackathons · hackr",
  description: "Upcoming hackathons from sources whose terms allow hackr to list them, soonest first.",
};

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="w-fit text-sm font-medium text-zinc-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-zinc-400"
        >
          hackr
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Upcoming hackathons</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          From the sources whose terms let hackr list them, updated daily. Each one links to its own
          page and to where hackr found it. Found one you like?{" "}
          <Link href="/coach" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50">
            Paste its rules into the coach
          </Link>
          .
        </p>
      </header>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading hackathons…</p>}>
        <EventList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
