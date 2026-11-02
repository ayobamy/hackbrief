import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { EventList, EventListSkeleton } from "./event-list";

export const metadata: Metadata = {
  title: "Upcoming hackathons",
  description: "Upcoming hackathons from sources whose terms allow hackbrief to list them, soonest first.",
};

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <header className="relative overflow-hidden border-b border-line">
          <div
            className="dot-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_10%,transparent_90%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-14 pb-12 sm:px-6">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Hackathons</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Upcoming hackathons</h1>
            <p className="max-w-2xl leading-7 text-muted">
              From the sources whose terms let hackbrief list them, updated daily. Each one links to its own page
              and to where hackbrief found it. Found one you like?{" "}
              <Link href="/coach" className="font-medium text-ink underline underline-offset-4">
                Paste its rules into the coach
              </Link>
              .
            </p>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <Suspense fallback={<EventListSkeleton />}>
            <EventList searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
