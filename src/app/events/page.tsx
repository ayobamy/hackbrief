import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { EventList } from "./event-list";

export const metadata: Metadata = {
  title: "Upcoming hackathons",
  description: "Upcoming hackathons from sources whose terms allow hackr to list them, soonest first.",
};

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Hackathons</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">Upcoming hackathons</h1>
          <p className="text-muted">
            From the sources whose terms let hackr list them, updated daily. Each one links to its own
            page and to where hackr found it. Found one you like?{" "}
            <Link href="/coach" className="font-medium text-ink underline underline-offset-4">
              Paste its rules into the coach
            </Link>
            .
          </p>
        </header>
        <Suspense fallback={<p className="text-muted">Loading hackathons…</p>}>
          <EventList searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
