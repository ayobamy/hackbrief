import { formatDate } from "@/lib/coach/format";
import { isPlaceholder } from "@/lib/sources/placeholder";

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// "Sat, 7 Nov", built from parts: without a year the en-GB format drops the comma ("Sat 7 Nov"),
// which would not match the "Sun, 8 Nov 2026" it is paired with.
function dayAndMonth(date: string): string {
  const parts = DAY_MONTH.formatToParts(new Date(`${date}T00:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("day")} ${part("month")}`;
}

/**
 * "Sat, 7 Nov 2026", or "Sat, 7 Nov – Sun, 8 Nov 2026" for a range in one year. Null when the
 * source gives no dates.
 */
export function formatDateRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn) {
    return endsOn ? `Until ${formatDate(endsOn)}` : null;
  }
  if (!endsOn || endsOn === startsOn) {
    return formatDate(startsOn);
  }
  if (startsOn.slice(0, 4) === endsOn.slice(0, 4)) {
    return `${dayAndMonth(startsOn)} – ${formatDate(endsOn)}`;
  }
  return `${formatDate(startsOn)} – ${formatDate(endsOn)}`;
}

/** "Lisbon, Portugal", the city alone, the country alone, or null. */
export function formatLocation(city: string | null, country: string | null): string | null {
  if (city && country && !city.includes(country)) {
    return `${city}, ${country}`;
  }
  return city ?? country;
}

const TILE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** The month and day of a start date, as a calendar tile shows them ("Nov" over "14"). */
export function dateTile(startsOn: string | null): { month: string; day: string } | null {
  if (!startsOn) {
    return null;
  }
  const parts = TILE.formatToParts(new Date(`${startsOn}T00:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { month: part("month"), day: part("day") };
}

/**
 * Prize text worth showing, trimmed, or null for placeholders. Rows imported before placeholders were
 * filtered still hold "TBA", and imports never blank a field out, so the check also runs here.
 */
export function prizeLine(text: string | null): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed && !isPlaceholder(trimmed) ? trimmed : null;
}
