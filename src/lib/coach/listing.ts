import { addDays, type KeyDate, kindAt, TIME } from "./dates";
import { toSentences } from "./text";

/** The dates hackbrief's listing gives an event, used only where its rules give none. */
export interface ListingDates {
  startsOn: string | null;
  endsOn: string | null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WEEKDAY = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
// Longer than this, a listing is a season or a programme, and "Sunday" no longer means one day.
const MAX_DAYS = 14;

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Every day the listing covers, first to last; none without a date or past two weeks. */
function daysOf({ startsOn, endsOn }: ListingDates): string[] {
  const first = startsOn ?? endsOn;
  const last = endsOn ?? startsOn;
  if (!first || !last || last < first) {
    return [];
  }
  const days: string[] = [];
  for (let day = first; day <= last && days.length <= MAX_DAYS; day = addDays(day, 1)) {
    days.push(day);
  }
  return days.length > MAX_DAYS ? [] : days;
}

/** A sentence's weekday on the listing's only day of that name, as a submission date. */
// Read as extractDates reads a date, so "the priority deadline to apply is Saturday" or "winners are announced on
// Sunday" gives no deadline, while "projects are due on Sunday, and winners are announced at noon" does.
function weekdayDate(sentence: string, days: readonly string[]): KeyDate | null {
  const found = WEEKDAY.exec(sentence);
  const name = found && kindAt(sentence, found.index) === "submission" ? found[1]?.toLowerCase() : undefined;
  const matching = name ? days.filter((day) => WEEKDAYS[weekdayOf(day)] === name) : [];
  const [date] = matching;
  return matching.length === 1 && date
    ? { label: "Submission deadline", kind: "submission", date, time: TIME.exec(sentence)?.[0] ?? null, yearAssumed: false, source: sentence }
    : null;
}

/** A deadline the rules give as a weekday ("by 9 AM on Sunday"), on the listing's only day of that name. */
function weekdayDeadline(input: string, days: readonly string[]): KeyDate | null {
  for (const { text } of toSentences(input)) {
    const found = weekdayDate(text, days);
    if (found) {
      return found;
    }
  }
  return null;
}

/** The weekday in a sentence the page marks as the deadline, on the listing's day of that name. */
export function weekdayOnListing(sentence: string, listing: ListingDates): KeyDate | null {
  return weekdayDate(sentence, daysOf(listing));
}

function fromListing(date: string, kind: "start" | "submission", label: string): KeyDate {
  return { label, kind, date, time: null, yearAssumed: false, source: "hackbrief's listing of this event", fromListing: true };
}

/**
 * The dates from the rules, completed from the listing where the rules give none: a deadline written
 * as a weekday goes on the listing's day of that name, and otherwise the listing's first and last days
 * stand in for the start and the deadline, marked as coming from the listing.
 */
export function withListingDates(input: string, dates: readonly KeyDate[], listing: ListingDates): KeyDate[] {
  const days = daysOf(listing);
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) {
    return [...dates];
  }
  const added: KeyDate[] = [];
  if (!dates.some((date) => date.kind === "start")) {
    added.push(fromListing(first, "start", "First day of the event, from the listing"));
  }
  if (!dates.some((date) => date.kind === "submission")) {
    added.push(weekdayDeadline(input, days) ?? fromListing(last, "submission", "Last day of the event, from the listing"));
  }
  return [...dates, ...added].sort((a, b) => a.date.localeCompare(b.date));
}
