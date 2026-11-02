import type { Amount } from "./prizes";
import type { TeamSize } from "./team";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2027-03-14" as "Sun, 14 Mar 2027"; the date is shown as written, with no time-zone shift. */
export function formatDate(date: string): string {
  return DATE_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

export function formatDaysLeft(days: number): string {
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  if (days === -1) {
    return "Yesterday";
  }
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

/** An amount in its currency ("$3,000"); codes that are not ISO currencies ("USDC") stay as words. */
export function formatAmount({ currency, value }: Amount): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en")}`;
  }
}

function people(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

/** "1 to 4 people", "Up to 4 people", "At least 2 people" or "Any team size". */
export function formatTeamSize(team: TeamSize): string {
  if (team.min !== null && team.max !== null) {
    return team.min === team.max ? people(team.max) : `${team.min} to ${team.max} people`;
  }
  if (team.max !== null) {
    return `Up to ${people(team.max)}`;
  }
  return team.min !== null && team.min > 1 ? `At least ${people(team.min)}` : "Any team size";
}

export function formatSolo(team: TeamSize): string {
  if (team.soloAllowed === null) {
    return "Solo entry not mentioned";
  }
  return team.soloAllowed ? "You can enter alone" : "No solo entries";
}

export function formatTeam(team: TeamSize): string {
  return `${formatTeamSize(team)}; ${formatSolo(team).toLowerCase()}`;
}
