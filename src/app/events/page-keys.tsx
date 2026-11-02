"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Places where the arrow keys already mean something: text entry, and widgets that move with them.
const USES_ARROWS =
  "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role=tablist], [role=tab], [role=slider], [role=listbox], [role=menu], [role=menubar], [role=radiogroup], [role=grid], [role=tree], [role=combobox]";

function usesArrows(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(USES_ARROWS) !== null;
}

/**
 * The Left and Right arrow keys turn the list's pages, alongside the pager's links. They are ignored
 * while typing, inside widgets that use arrows, when held down, and with a modifier key (Alt+Left is
 * the browser's Back). After a page change, focus moves to the results line, which names the page.
 */
export function PageKeys({
  page,
  filters,
  previous,
  next,
}: {
  page: number;
  /** The filters' query string: changing filters starts again at page 1 without moving focus. */
  filters: string;
  previous: string | null;
  next: string | null;
}) {
  const router = useRouter();
  const shown = useRef({ page, filters });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const href = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
      if (!href || usesArrows(event.target)) {
        return;
      }
      event.preventDefault();
      router.push(href, { scroll: false });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, previous, next]);

  useEffect(() => {
    const before = shown.current;
    shown.current = { page, filters };
    if (before.page === page || before.filters !== filters) {
      return;
    }
    const results = document.getElementById("results");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    results?.focus({ preventScroll: true });
    results?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [page, filters]);

  return null;
}
