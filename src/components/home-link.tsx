"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

/**
 * The logo's link home, which always lands on the home page's hero. Next.js keeps the scroll position
 * when the new page fills the window, and a link to the page already shown does nothing, so the window
 * goes to the top first: smoothly when already home, unless the visitor prefers less motion.
 */
export function HomeLink({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  // The address is read on the click, not with usePathname: an event's page (/events/<id>) is built ahead
  // without its address, which a hook would need while rendering.
  function toTop(event: MouseEvent<HTMLAnchorElement>) {
    // A click that opens a new tab or window leaves this page where it is.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const home = window.location.pathname === "/";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: home && !still ? "smooth" : "instant" });
    if (home) {
      event.preventDefault();
    }
  }

  return (
    <Link href="/" aria-label={label} className={className} onClick={toTop}>
      {children}
    </Link>
  );
}
