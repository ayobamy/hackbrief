import { timingSafeEqual } from "node:crypto";

// Guards the import route and the database part of the health check. Vercel Cron sends
// "Authorization: Bearer <CRON_SECRET>"; anything shorter than this is refused
// as a secret, so a missing or placeholder value can never open the route.
const MIN_SECRET_LENGTH = 16;

/** Whether a request carries the secret. With no secret configured, none does. */
export function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !header) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
