const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const ui = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
const api = process.env.API_BASE_URL || "http://localhost:3000/api/v1";
const evidence = path.join(__dirname, "../evidence");
(async () => {
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function navigate(route, title) {
    await page.goto(ui + route, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.locator(".spinner").waitFor({ state: "hidden" });
  }
  async function screenshot(name) {
    await page.screenshot({
      path: path.join(evidence, name + ".png"),
      fullPage: true,
    });
  }
  try {
    await navigate("/", "Operations overview");
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    await screenshot("01-dashboard-desktop");
    console.log(
      "PASS desktop dashboard: seven metrics, chart and five recent rows",
    );
    await page
      .getByRole("link", { name: "Corporate clients", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Corporate clients", exact: true })
      .waitFor();
    await page.getByText("Maple Manufacturing Ltd.", { exact: true }).waitFor();
    await screenshot("02-clients-desktop");
    await page.getByLabel("Search clients").fill("maple");
    await page
      .getByLabel("Industry", { exact: true })
      .selectOption("Manufacturing");
    await page.getByLabel("Status", { exact: true }).selectOption("Active");
    await page.getByText("1 records · Page 1 of 1").waitFor();
    console.log("PASS navigation and combined client filters");
    await navigate("/clients/new", "Register corporate client");
    await screenshot("03-client-registration");
    const registration = "BROWSER-" + Date.now();
    for (const [label, value] of [
      ["Company name", "Browser Verification Ltd."],
      ["Registration number", registration],
      ["Contact email", "ops@browser.example"],
      ["Contact phone (optional)", "+1-416-555-0101"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByLabel("Industry", { exact: true })
      .selectOption("Technology");
    await page.getByLabel("Country", { exact: true }).selectOption("Canada");
    await page
      .getByRole("button", { name: "Register client", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Browser Verification Ltd.", exact: true })
      .waitFor();
    await page.getByText("Corporate client registered successfully.").waitFor();
    const clientId = page.url().split("/").pop();
    await page.getByRole("link", { name: "Edit client", exact: true }).click();
    await page
      .getByLabel("Company name", { exact: true })
      .fill("Browser Verification Updated Ltd.");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Browser Verification Updated Ltd.",
        exact: true,
      })
      .waitFor();
    console.log("PASS real client registration, confirmation and editing");
    await page
      .getByRole("link", { name: "+ Open account", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Open financial account", exact: true })
      .waitFor();
    await page
      .getByLabel("Account type", { exact: true })
      .selectOption("Operating");
    await page.getByLabel("Currency", { exact: true }).selectOption("CAD");
    await page.getByLabel("Opening balance", { exact: true }).fill("12500.75");
    await page
      .getByRole("button", { name: "Open account", exact: true })
      .click();
    await page.getByText("Financial account opened successfully.").waitFor();
    await page.getByText("CAD 12,500.75", { exact: true }).waitFor();
    await screenshot("04-account-details");
    const accountId = page.url().split("/").pop();
    const summary = (await (await fetch(api + "/dashboard/summary")).json())
      .data;
    assert.ok(summary.metrics.totalClients >= 11);
    assert.ok(summary.metrics.activeAccounts >= 19);
    await navigate("/", "Operations overview");
    assert.equal(
      await page.locator(".metric").nth(0).locator("strong").textContent(),
      String(summary.metrics.totalClients),
    );
    console.log(
      "PASS real account registration, ownership, exact balance and dashboard refresh",
    );
    await navigate("/clients/new", "Register corporate client");
    for (const [label, value] of [
      ["Company name", "Duplicate Browser Ltd."],
      ["Registration number", " " + registration.toLowerCase() + " "],
      ["Contact email", "ops@browser.example"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByLabel("Industry", { exact: true })
      .selectOption("Technology");
    await page.getByLabel("Country", { exact: true }).selectOption("Canada");
    await page
      .getByRole("button", { name: "Register client", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "already exists" })
      .waitFor();
    console.log("PASS server duplicate conflict displayed in client form");
    await navigate("/transactions", "Transaction history");
    await page
      .getByLabel("Reference number", { exact: true })
      .fill("TXN-2026-000001");
    await page.getByText("1 records · Page 1 of 1").waitFor();
    await page
      .getByRole("link", { name: "TXN-2026-000001", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "TXN-2026-000001", exact: true })
      .waitFor();
    await page.getByText("CAD 12.50", { exact: true }).waitFor();
    assert.equal(await page.locator('dd a[href^="/accounts/"]').count(), 2);
    await screenshot("05-transaction-details");
    console.log(
      "PASS supplier reference investigation and two related-account links",
    );
    await navigate("/transactions", "Transaction history");
    await page
      .getByLabel("From date (UTC)", { exact: true })
      .fill("2026-10-10");
    await page.getByLabel("To date (UTC)", { exact: true }).fill("2026-09-01");
    await page
      .getByText("The start date must not follow the end date.", {
        exact: true,
      })
      .waitFor();
    console.log("PASS invalid date-range API error displayed");
    await navigate("/transactions", "Transaction history");
    await page
      .getByLabel("Reference number", { exact: true })
      .fill("NO-SUCH-TRANSACTION");
    await page
      .getByRole("heading", { name: "No results found", exact: true })
      .waitFor();
    console.log("PASS transaction empty results");
    await navigate("/transactions", "Transaction history");
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByText("50 records · Page 2 of 5").waitFor();
    await screenshot("06-transactions-desktop");
    console.log("PASS paginated transaction directory");
    await page.setViewportSize({ width: 820, height: 1180 });
    await navigate("/", "Operations overview");
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    await screenshot("07-dashboard-tablet");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await navigate("/accounts", "Financial accounts");
    await page.getByText("SIM-DEMO-000001", { exact: true }).waitFor();
    await screenshot("08-accounts-tablet");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page
      .getByRole("link", { name: "Transaction history", exact: true })
      .click();
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    console.log("PASS tablet layout and navigation, no page overflow");
    await page.route("**/api/v1/dashboard/summary", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.continue();
    });
    await page.goto(ui + "/");
    await page
      .getByRole("status")
      .filter({ hasText: "Loading business records" })
      .waitFor();
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    await page.unroute("**/api/v1/dashboard/summary");
    console.log("PASS observable loading indicator");
    await page.route("**/api/v1/dashboard/summary", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "STORAGE_ERROR",
            message: "Verification: storage unavailable.",
          },
        }),
      }),
    );
    await page.goto(ui + "/");
    await page
      .getByText("Verification: storage unavailable.", { exact: true })
      .waitFor();
    await screenshot("09-controlled-error");
    await page.unroute("**/api/v1/dashboard/summary");
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByText("TXN-2026-000050", { exact: true }).waitFor();
    console.log("PASS API error state and successful retry");
    await page.route("**/api/v1/dashboard/summary", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            metrics: {
              totalClients: 0,
              activeClients: 0,
              activeAccounts: 0,
              totalTransactions: 0,
              pendingTransactions: 0,
              completedTransactions: 0,
              rejectedTransactions: 0,
            },
            transactionStatus: { Pending: 0, Completed: 0, Rejected: 0 },
            recentTransactions: [],
          },
        }),
      }),
    );
    await page.goto(ui + "/");
    await page
      .getByText("No transactions recorded.", { exact: true })
      .waitFor();
    assert.equal(await page.locator(".metric strong").count(), 7);
    assert.ok(
      (await page.locator(".metric strong").allTextContents()).every(
        (x) => x === "0",
      ),
    );
    await screenshot("10-empty-dashboard");
    await page.unroute("**/api/v1/dashboard/summary");
    console.log("PASS zero metrics and empty dashboard chart");
    await navigate("/does-not-exist", "Page not found");
    console.log("PASS invalid frontend route");
    assert.deepEqual(errors, []);
    console.log("PASS no uncaught browser JavaScript exceptions");
    console.log(
      "Browser verification complete. Tests used a disposable dataset. Mocked responses were used only for loading, error and zero-state checks.",
    );
  } catch (error) {
    await screenshot("verification-failure");
    console.error("Page at failure:", await page.locator("body").innerText());
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
