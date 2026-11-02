import { hostOf } from "./url";

// Platforms whose terms forbid collection or say to ask first (docs/sources.md, "Ask permission"
// and "Do not collect"). An entry that an open list took from one of them is left out, so hackbrief
// never collects their listings second-hand. Kaggle and DrivenData are here too: hackbrief reads them
// only through their own API or GitHub repository.
const RESTRICTED_DOMAINS = [
  "devpost.com",
  "mlh.io",
  "mlh.com",
  "luma.com",
  "lu.ma",
  "lablab.ai",
  "ethglobal.com",
  "devfolio.co",
  "unstop.com",
  "dorahacks.io",
  "taikai.network",
  "hackerearth.com",
  "hack2skill.com",
  "meetup.com",
  "angelhack.com",
  "hackathon.com",
  "agorize.com",
  "colosseum.com",
  "hackquest.io",
  "encodeclub.com",
  "zindi.africa",
  "aicrowd.com",
  "kaggle.com",
  "drivendata.org",
  "superteam.fun",
  "peatix.com",
  "connpass.com",
  "konfhub.com",
  "allevents.in",
] as const;

// Eventbrite runs a site per country (eventbrite.co.uk, eventbrite.com.ng and so on).
const EVENTBRITE = /(?:^|\.)eventbrite\.[a-z.]+$/;

/** Whether a URL is on a platform hackbrief may not collect from second-hand. */
export function isRestrictedUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) {
    return true;
  }
  return EVENTBRITE.test(host) || RESTRICTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// Sources hackbrief may read only through their feed (docs/sources.md): their pages are left alone.
const FEED_ONLY_DOMAINS = ["hackster.io"] as const;

/** Whether a URL is on a source whose feed hackbrief uses but whose pages it does not read. */
export function isFeedOnlyUrl(url: string): boolean {
  const host = hostOf(url);
  return host !== null && FEED_ONLY_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
