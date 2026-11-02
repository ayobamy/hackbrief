import Link from "next/link";

import { Logo } from "./logo";
import { REPOSITORY_URL } from "./site-header";

const LINK =
  "text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted">
            A free, non-commercial hackathon finder and coach, open source under the MIT licence.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2">
          <Link href="/events" className={LINK}>
            Hackathons
          </Link>
          <Link href="/coach" className={LINK}>
            Coach
          </Link>
          <a href={REPOSITORY_URL} className={LINK}>
            Source code
          </a>
          <a href={`${REPOSITORY_URL}/blob/main/docs/sources.md`} className={LINK}>
            Where the data comes from
          </a>
          <a href={`${REPOSITORY_URL}/blob/main/docs/coach.md`} className={LINK}>
            How the coach works
          </a>
          <a href={`${REPOSITORY_URL}/blob/main/LICENSE`} className={LINK}>
            MIT licence
          </a>
        </nav>
      </div>
    </footer>
  );
}
