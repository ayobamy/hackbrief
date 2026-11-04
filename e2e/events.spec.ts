import { expect, test, type Page } from "@playwright/test";

import { STORED_BRIEF } from "./seed";

// The list holds the 26 fictional hackathons from e2e/seed.ts: pages of 12, 12 and 2. Nine are
// online, three of those listed by Hack Club Hackathons.

test("the hackathon list turns its pages with the pager and the arrow keys", async ({ page }) => {
  await page.goto("/events");

  const results = page.locator("#results");
  await expect(results).toHaveText("Showing 1–12 of 26 hackathons · Page 1 of 3");
  await expect(page.getByRole("heading", { level: 2, name: "Happening now" })).toBeVisible();
  const underway = page.getByRole("listitem").filter({ hasText: "Fictional Hack 00" });
  await expect(underway).toContainText("Happening now");
  await expect(underway.getByRole("link", { name: "Fictional Hack 00", exact: true })).toHaveAttribute(
    "href",
    "https://example.org/fictional-hack-00",
  );

  const pager = page.getByRole("navigation", { name: "Pages" });
  await expect(pager.getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  await expect(pager.getByText("Previous page")).toHaveAttribute("aria-disabled", "true");

  // A pager link moves to the next page and puts focus on the line that names it.
  await pager.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/events\?page=2$/);
  await expect(results).toHaveText("Showing 13–24 of 26 hackathons · Page 2 of 3");
  await expect(results).toBeFocused();

  // The arrow keys do the same.
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/events\?page=3$/);
  await expect(results).toHaveText("Showing 25–26 of 26 hackathons · Page 3 of 3");
  await expect(page.getByRole("heading", { level: 2, name: "Dates to be announced" })).toBeVisible();
  await expect(pager.getByText("Next page")).toHaveAttribute("aria-disabled", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/\/events\?page=2$/);
  await expect(pager.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
});

test("a filter shows its count, narrows the list and starts again at page 1", async ({ page }) => {
  await page.goto("/events?page=2");

  await page.getByRole("link", { name: "Online 9 hackathons" }).click();
  await expect(page).toHaveURL(/\/events\?format=online$/);
  await expect(page.locator("#results")).toHaveText("9 hackathons");
  await expect(page.getByRole("navigation", { name: "Pages" })).toHaveCount(0);

  // Source counts now count online hackathons only.
  await expect(page.getByRole("link", { name: "Hack Club Hackathons 3 hackathons" })).toBeVisible();
});

const RULES = "Judging\n- Innovation (60%)\n- Design (40%)\nSubmission deadline: 2027-03-14\nTeams of up to 3.";

test("a listing opens its own page, and from there the coach takes its rules", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: "Build my brief for Fictional Hack 01" }).click();

  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fictional Hack 01" })).toBeVisible();
  // With reading switched off there is no brief yet: the way on is the organiser's page and the coach.
  await expect(page.getByRole("link", { name: /Open its rules on example.org/ })).toHaveAttribute("href", "https://example.org/fictional-hack-01");
  await page.getByRole("link", { name: "paste them into the coach" }).click();

  await expect(page).toHaveURL(/\/coach\?event=[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: "Fictional Hack 01" })).toBeVisible();
  // A listed event needs no page link of its own.
  await expect(page.getByLabel(/The hackathon's page/)).toHaveCount(0);
  await page.getByLabel("Hackathon rules and judging text").fill(RULES);
  await page.getByRole("button", { name: "Build my brief" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Brief: Fictional Hack 01" })).toBeFocused();
});

test("a listing whose brief is built opens on it at once: facts first, their sources, and a calendar file", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: `Open the brief for ${STORED_BRIEF}` }).click();

  await expect(page.getByRole("heading", { level: 1, name: STORED_BRIEF })).toBeVisible();
  await expect(page.getByText("Prepared from example.org/fictional-hack-03")).toBeVisible();
  await expect(page.getByText("Up to 4 people").first()).toBeVisible();
  await expect(page.getByText("The hackathon is open to students aged 16 and over.").first()).toBeVisible();
  await page.getByText("From the rules").first().click();
  await expect(page.getByText(/Submissions close on \d{4}-\d{2}-\d{2} at 9:00 AM\./).first()).toBeVisible();

  const calendar = page.getByRole("link", { name: "Add the deadline to your calendar" });
  const response = await page.request.get((await calendar.getAttribute("href")) ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toMatch(/BEGIN:VEVENT\r\n[\s\S]*DTSTART;VALUE=DATE:\d{8}\r\n/);
  await expect(page.getByRole("link", { name: "Paste its rules into the coach" })).toHaveAttribute("href", /\/coach\?event=/);
});

test("opening another listing starts fresh in the coach, whatever the last one held", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: "Build my brief for Fictional Hack 01" }).click();
  await page.getByRole("link", { name: "paste them into the coach" }).click();
  await page.getByLabel("Hackathon rules and judging text").fill(RULES);
  await page.getByRole("button", { name: "Build my brief" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Brief: Fictional Hack 01" })).toBeVisible();

  // Back to the list and on to another hackathon, as a visitor comparing them does. Pages left behind
  // stay in the document, hidden, so only what is visible counts.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Hackathons" }).click();
  await page.getByRole("link", { name: "Build my brief for Fictional Hack 02" }).click();
  await page.getByRole("link", { name: "paste them into the coach" }).filter({ visible: true }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Fictional Hack 02", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hackathon rules and judging text").filter({ visible: true })).toHaveValue("");
  await expect(page.getByRole("heading", { level: 2, name: /^Brief:/ })).toHaveCount(0);
});

test("a malformed event id gives the plain coach, where a typed page link labels the brief", async ({ page }) => {
  await page.goto("/coach?event=not-an-id");
  await expect(page.getByText("Building a brief for")).toHaveCount(0);

  await page.getByLabel(/The hackathon's page/).fill("lagoon-hack.example/rules");
  await page.getByLabel("Hackathon rules and judging text").fill(RULES);
  await page.getByRole("button", { name: "Build my brief" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Your brief" })).toBeFocused();
  await expect(page.getByRole("link", { name: "lagoon-hack.example" })).toHaveAttribute(
    "href",
    "https://lagoon-hack.example/rules",
  );
});

test("a listing whose licence asks for it credits its licensor and last update, on the list and in the coach", async ({ page }) => {
  await page.goto("/events");

  const card = page.getByRole("listitem").filter({ hasText: "Fictional Hack 09" });
  await expect(card).toContainText("Listed by Université Fictive on OpenAgenda (Licence Ouverte 2.0), updated 19 Oct 2026");
  await expect(card.getByRole("link", { name: "Université Fictive" })).toHaveAttribute("href", "https://universite-fictive.example/");
  await expect(card.getByRole("link", { name: "OpenAgenda (Licence Ouverte 2.0)" })).toHaveAttribute(
    "href",
    "https://example.org/listed/09",
  );

  await card.getByRole("link", { name: "Build my brief for Fictional Hack 09" }).click();
  await expect(page.getByText("Listed by Université Fictive on OpenAgenda (Licence Ouverte 2.0), updated 19 Oct 2026.")).toBeVisible();
});

// Watches every change to the page from now on, so even a moment's flash of `text` at `address` counts.
async function watchForStale(page: Page, address: string, text: string): Promise<void> {
  await page.evaluate(
    ({ address, text }) => {
      const seen = window as typeof window & { staleSeen?: boolean };
      seen.staleSeen = false;
      const check = () => {
        if (`${location.pathname}${location.search}` !== address) {
          return;
        }
        for (const element of document.querySelectorAll("li, p, dd")) {
          if (element.textContent?.includes(text) && element.checkVisibility()) {
            seen.staleSeen = true;
          }
        }
      };
      new MutationObserver(check).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    },
    { address, text },
  );
}

const staleSeen = (page: Page) => page.evaluate(() => (window as typeof window & { staleSeen?: boolean }).staleSeen);

test("another listing's brief never shows the last one's, not even while it loads, on its page or in the coach", async ({ page }) => {
  // Pages left behind stay in the document, hidden, each with its own header, so only what is visible counts.
  const stale = "The hackathon is open to students aged 16 and over.";
  await page.goto("/events");
  await page.getByRole("link", { name: `Open the brief for ${STORED_BRIEF}` }).click();
  await expect(page.getByText(stale).first()).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).filter({ visible: true }).getByRole("link", { name: "Hackathons" }).click();
  const next = page.getByRole("link", { name: "Build my brief for Fictional Hack 02" });
  await watchForStale(page, (await next.getAttribute("href")) ?? "", stale);
  await next.click();
  await expect(page.getByRole("heading", { level: 1, name: "Fictional Hack 02" })).toBeVisible();
  expect(await staleSeen(page)).toBe(false);

  // The same in the coach: the stored brief's coach, then another listing's.
  await page.goto("/events");
  await page.getByRole("link", { name: `Open the brief for ${STORED_BRIEF}` }).click();
  // The event's page has taken over from the list before its link to the coach is followed.
  await expect(page.getByText("Prepared from").first()).toBeVisible();
  await page.getByRole("link", { name: "Paste its rules into the coach" }).click();
  // Only the coach has this heading: the event's page, which also shows the brief, has given way to it.
  await expect(page).toHaveURL(/\/coach\?event=/);
  await expect(page.getByRole("heading", { level: 2, name: `Brief: ${STORED_BRIEF}` })).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).filter({ visible: true }).getByRole("link", { name: "Hackathons" }).click();
  await page.getByRole("link", { name: "Build my brief for Fictional Hack 02" }).click();
  const coach = page.getByRole("link", { name: "paste them into the coach" }).filter({ visible: true });
  await watchForStale(page, (await coach.getAttribute("href")) ?? "", stale);
  await coach.click();
  await expect(page.getByRole("heading", { level: 2, name: "Fictional Hack 02", exact: true })).toBeVisible();
  expect(await staleSeen(page)).toBe(false);
});
