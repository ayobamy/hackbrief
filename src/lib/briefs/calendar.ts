import { addDays } from "@/lib/coach/dates";

const MAX_LINE_BYTES = 75;

// RFC 5545 §3.3.11: a backslash, semicolon, comma or line break in text is escaped.
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545 §3.1: a line longer than 75 bytes continues on the next line after a space, and a
// character is never split between lines.
function fold(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    const limit = lines.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1;
    if (bytes + size > limit) {
      lines.push(current);
      current = "";
      bytes = 0;
    }
    current += character;
    bytes += size;
  }
  lines.push(current);
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`));
}

const compact = (date: string) => date.replace(/-/g, "");

/**
 * A calendar file holding an event's submission deadline (#62), as RFC 5545 asks: an all-day event on
 * the deadline's date, since hackbrief does not convert time zones; the time, as the rules state it, is
 * in the description, and an alarm goes off a day before.
 */
export function deadlineCalendar({
  eventId,
  eventName,
  deadline,
  url,
  now,
}: {
  eventId: string;
  eventName: string;
  deadline: { date: string; time: string | null };
  url: string;
  now: Date;
}): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const due = deadline.time ? `Due ${deadline.time}, as the rules state it.` : "The rules give no time.";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//hackbrief//hackbrief.dev//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${eventId}-deadline@hackbrief.dev`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(deadline.date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(deadline.date, 1))}`,
    `SUMMARY:${text(`Submission deadline: ${eventName}`)}`,
    `DESCRIPTION:${text(`${due} The brief: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${text(`Submissions for ${eventName} close tomorrow.`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(fold).join("\r\n")}\r\n`;
}
