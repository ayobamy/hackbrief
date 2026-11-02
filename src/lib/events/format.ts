import { formatDate } from "@/lib/coach/format";

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
