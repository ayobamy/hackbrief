import { expect, test } from "@playwright/test";

test("the home page leads to the coach and the event list", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pick the right hackathon.",
  );
  await expect(
    page.getByRole("link", { name: "Browse upcoming hackathons" }),
  ).toHaveAttribute("href", "/events");
  await expect(page.getByRole("link", { name: "hackbrief, home" })).toHaveAttribute(
    "href",
    "/",
  );
  await page.getByRole("link", { name: "Paste a hackathon's rules" }).click();
  await expect(page).toHaveURL(/\/coach$/);
});

test("the landing page runs the coach: samples switch, the rubric playground rewrites advice", async ({
  page,
}) => {
  await page.goto("/");

  // The hero demo is the coach itself, not a picture of it.
  await page.getByRole("tab", { name: "Harbour Light Climate Hack" }).click();
  await expect(
    page.getByRole("tab", { name: "Harbour Light Climate Hack" }),
  ).toHaveAttribute("aria-selected", "true");
  const topCriterion = page
    .getByRole("list", { name: "Judging weights" })
    .getByRole("listitem")
    .filter({ hasText: "Impact on emissions" });
  await expect(topCriterion).toContainText("Focus");
  await expect(topCriterion).toContainText("38%");
  await expect(
    page.getByText(/^Read 1,063 characters in [\d.]+ ms$/),
  ).toBeVisible();

  // Each card can point at the lines of the rules it came from.
  const showDeadline = page.getByRole("button", {
    name: "Show in the rules: Deadline",
  });
  await showDeadline.click();
  await expect(showDeadline).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("region", { name: "The rules of Harbour Light Climate Hack" })
      .locator('[data-card="0"]'),
  ).toContainText("Submissions are due March 7, 2027");

  // Moving a weight rescales the rubric and rewrites the advice, with the coach's own code.
  const slider = page.getByLabel("Technical quality");
  await slider.focus();
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await expect(
    page.getByText("The weights add up to 120%", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Technical quality is 42%:", { exact: false }),
  ).toBeVisible();

  // The moving band of platforms can be paused.
  await page
    .getByRole("button", { name: "Pause the moving list of platforms" })
    .click();
  await expect(
    page.getByRole("button", { name: "Play the moving list of platforms" }),
  ).toBeVisible();
  await expect(page.locator(".marquee-track")).toHaveAttribute(
    "data-paused",
    "true",
  );
});

test("a sample builds a brief and moves focus to it", async ({ page }) => {
  await page.goto("/coach");

  await page
    .getByRole("button", { name: "Harbour Light Climate Hack" })
    .click();

  const heading = page.getByRole("heading", { level: 2, name: "Your brief" });
  await expect(heading).toBeFocused();
  await expect(page.getByText("Sun, 7 Mar 2027, 11:59 PM PT")).toBeVisible();
  await expect(page.getByText("2 to 5 people")).toBeVisible();
  await expect(page.getByText("No solo entries")).toBeVisible();
  await expect(
    page.getByText("Impact on emissions is 38%:", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Brief ready: 4 judging criteria",
  );
});

test("pasted rules without weights or a deadline say what is missing", async ({
  page,
}) => {
  await page.goto("/coach");
  const build = page.getByRole("button", { name: "Build my brief" });
  await expect(build).toBeDisabled();

  await page
    .getByLabel("Hackathon rules and judging text")
    .fill("Judging\n- Innovation\n- Design\nTeams of up to 3.");
  await build.click();

  await expect(page.getByText("Up to 3 people")).toBeVisible();
  await expect(page.getByText("Solo entry not mentioned")).toBeVisible();
  await expect(
    page.getByText("The rules list 2 criteria without weights", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No submission deadline found", { exact: false }),
  ).toBeVisible();
});

test("the logo takes you to the top of the home page from anywhere", async ({ page }) => {
  const scrolled = () => page.evaluate(() => window.scrollY);
  const logo = page.getByRole("link", { name: "hackbrief, home" });

  await page.goto("/events");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(scrolled).toBeGreaterThan(0);
  await logo.click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(scrolled).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();

  // Already home, part-way down: the logo goes back up to the hero.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(scrolled).toBeGreaterThan(0);
  await logo.click();
  await expect.poll(scrolled).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});
