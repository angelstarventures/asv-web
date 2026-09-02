const { chromium } = require("playwright-core");

const EXEC_PATH = "C:\\Users\\adilj\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";
const BASE = "http://localhost:3000";
const SHOT_DIR = "C:\\Users\\adilj\\AppData\\Local\\Temp\\claude\\c--Users-adilj-dev-website\\67bb01bd-06a1-4e3d-9203-c253c8940569\\scratchpad";

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC_PATH, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  try {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill("adiljagmag@gmail.com");
    await page.getByLabel(/password/i).fill("X8sN6vWXNSmGS4L");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await page.waitForURL(/\/member\/dashboard|\/admin/, { timeout: 15000 });

    await page.goto(`${BASE}/admin/ledger`);
    await page.getByRole("link", { name: "Manage Ledger" }).click();
    await page.waitForSelector("table", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOT_DIR}/manage-ledger-sort-check.png`, fullPage: false });

    const headerButtons = await page.locator("thead button").allInnerTexts();
    console.log("HEADER_BUTTONS:", JSON.stringify(headerButtons));

    const dateBefore = await page.locator("tbody tr").first().locator("td").first().innerText();
    await page.locator("thead").getByRole("button", { name: /^type$/i }).click();
    await page.waitForTimeout(300);
    const typeAfterClick1 = await page.locator("tbody tr").first().locator("td").nth(2).innerText();
    await page.locator("thead").getByRole("button", { name: /^type$/i }).click();
    await page.waitForTimeout(300);
    const typeAfterClick2 = await page.locator("tbody tr").first().locator("td").nth(2).innerText();

    console.log("dateBefore:", dateBefore, "typeAsc:", typeAfterClick1, "typeDesc:", typeAfterClick2);
    console.log("ERRORS:", JSON.stringify(errors));
  } catch (err) {
    console.log("SCRIPT ERROR:", err.message);
    await page.screenshot({ path: `${SHOT_DIR}/manage-ledger-sort-error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
})();
