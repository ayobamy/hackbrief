import { connection } from "next/server";

import { getEvent, getStoredBrief } from "@/app/events/data";
import { deadlineCalendar } from "@/lib/briefs/calendar";
import { parseEventId } from "@/lib/events/context";

const SITE = "https://hackbrief.dev";

/** The event's submission deadline as a calendar file (#62), from its stored brief. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = parseEventId({ event: (await params).id });
  const event = id ? await getEvent(id) : null;
  const deadline = id ? (await getStoredBrief(id))?.facts?.deadline : null;
  if (!id || !event || !deadline) {
    return new Response("No deadline to add for this event.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const calendar = deadlineCalendar({ eventId: id, eventName: event.name, deadline, url: `${SITE}/events/${id}`, now: new Date() });
  return new Response(calendar, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${id}-deadline.ics"`,
      "cache-control": "no-store",
    },
  });
}
