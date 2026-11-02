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
  await expect(page.getByRole("link", { name: "hackr, home" })).toHaveAttribute(
    "href",
    "/",
  );
  // The landing page shows a real brief from the coach, not a picture of one.
  await expect(page.getByText("Impact on emissions", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Paste a hackathon's rules" }).click();
  await expect(page).toHaveURL(/\/coach$/);
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
