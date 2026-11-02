import { expect, test } from "@playwright/test";

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

test("a listing opens the coach for that hackathon, and the brief carries its name", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: "Build my brief for Fictional Hack 01" }).click();

  await expect(page).toHaveURL(/\/coach\?event=[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: "Fictional Hack 01" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open its rules/ })).toHaveAttribute(
    "href",
    "https://example.org/fictional-hack-01",
  );
  // A listed event needs no page link of its own.
  await expect(page.getByLabel(/The hackathon's page/)).toHaveCount(0);

  await page.getByLabel("Hackathon rules and judging text").fill(RULES);
  await page.getByRole("button", { name: "Build my brief" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Brief: Fictional Hack 01" })).toBeFocused();
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
