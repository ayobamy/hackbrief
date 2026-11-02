import Link from "next/link";

import { Logo } from "./logo";

export const REPOSITORY_URL = "https://github.com/ayobamy/hackr";

const LINK =
  "rounded-md px-2 py-1 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** The bar at the top of every page: the logo home, the two features, and the source code. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          aria-label="hackr, home"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          <Link href="/events" className={LINK}>
            Hackathons
          </Link>
          <Link href="/coach" className={LINK}>
            Coach
          </Link>
          <a href={REPOSITORY_URL} className={`${LINK} hidden sm:inline`}>
            GitHub
          </a>
          <Link
            href="/coach"
            className="ml-1 hidden rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-block"
          >
            Paste the rules
          </Link>
        </nav>
      </div>
    </header>
  );
}
