import type { SkipReason } from "@/lib/rules/read";

const SKIPPED: Readonly<Record<Exclude<SkipReason, "off">, (host: string) => string>> = {
  restricted: (host) => `Its rules are on ${host}, which asks to be asked first, so hackbrief does not read it.`,
  robots: (host) => `${host} asks automated readers to leave this page alone, so hackbrief does.`,
  refused: (host) => `${host} turned hackbrief away, so it leaves the site alone for now.`,
  unreachable: (host) => `hackbrief could not reach ${host} just now.`,
  "not-html": (host) => `${host} gives its rules in a form hackbrief cannot read yet.`,
  empty: (host) => `${host} draws its page with JavaScript or keeps its rules elsewhere, so hackbrief found nothing to read.`,
};

/** Why an event has no brief, in plain words; null when reading is switched off (the end-to-end tests). */
export function skippedMessage(reason: SkipReason, host: string): string | null {
  return reason === "off" ? null : SKIPPED[reason](host);
}
