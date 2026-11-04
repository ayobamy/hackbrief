import type { DateKind, KeyDate } from "@/lib/coach/dates";

/** One row of a brief's key dates, as the event page shows them. */
export interface KeyDateRow {
  date: string;
  time: string | null;
  name: string;
  /** No source sentence for this date gave a year; hackbrief assumed one. */
  yearAssumed: boolean;
  /** The sentence the date came from. */
  source: string;
}

const KIND_NAMES: Readonly<Record<DateKind, string>> = {
  start: "Event starts",
  end: "Event ends",
  submission: "Submission deadline",
  registration: "Applications close",
  judging: "Judging",
  results: "Results",
  other: "Mentioned on the page",
};

// Words that say what a date is: two words of three letters or more, once a bare "Date" and the
// "first day" or "last day" hackbrief adds to a range are set aside ("Date: first day" says nothing).
function telling(label: string): boolean {
  const words = label.replace(/:\s*(?:first|last) day$/i, "").replace(/^date\b/i, "").match(/\p{L}{3,}/gu) ?? [];
  return words.length >= 2;
}

/**
 * A brief's dates as the event page lists them (#62): organisers' pages state their days several times
 * over, so each date appears once per kind, under the most telling words found for it; a date marked as
 * nothing in particular is dropped when it is already listed for something else.
 */
export function keyDates(dates: readonly KeyDate[]): KeyDateRow[] {
  const groups = new Map<string, KeyDate[]>();
  for (const date of dates) {
    const key = `${date.date}|${date.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), date]);
  }
  const rows = [...groups.values()].map((group) => {
    const [first] = group as [KeyDate, ...KeyDate[]];
    const named = group.find(({ label }) => telling(label));
    return {
      kind: first.kind,
      row: {
        date: first.date,
        time: group.find(({ time }) => time !== null)?.time ?? null,
        name: named?.label ?? KIND_NAMES[first.kind],
        yearAssumed: group.every(({ yearAssumed }) => yearAssumed),
        source: (named ?? first).source,
      },
    };
  });
  const marked = new Set(rows.filter(({ kind }) => kind !== "other").map(({ row }) => row.date));
  return rows
    .filter(({ kind, row }) => kind !== "other" || !marked.has(row.date))
    .map(({ row }) => row)
    .sort((a, b) => a.date.localeCompare(b.date));
}
