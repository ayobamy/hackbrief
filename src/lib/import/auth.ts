import { timingSafeEqual } from "node:crypto";

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; anything shorter than this is refused
// as a secret, so a missing or placeholder value can never open the route.
const MIN_SECRET_LENGTH = 16;

/** Whether a request may run the import. With no secret configured, nobody may. */
export function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !header) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
