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
  await expect(underway.getByRole("link", { name: "Fictional Hack 00" })).toHaveAttribute(
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
