import { chromium, firefox, webkit } from "playwright";

const engines = { chromium, firefox, webkit };
const url = "http://localhost:5173/";
const out = {};

for (const [name, launcher] of Object.entries(engines)) {
  console.log(`\n=== ${name} ===`);
  let browser;
  try {
    browser = await launcher.launch();
    const page = await browser.newPage();
    page.on("console", (msg) => console.log(`  [console] ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`  [pageerror] ${err}`));
    await page.goto(url);
    await page.waitForFunction("window.__SPIKE_DONE__ === true", { timeout: 30000 }).catch(() => {
      console.log("  [timeout] spike did not finish in time");
    });
    const results = await page.evaluate("window.__SPIKE_RESULTS__");
    out[name] = results;
  } catch (err) {
    out[name] = { error: String(err) };
    console.log(`  [launch error] ${err}`);
  } finally {
    if (browser) await browser.close();
  }
}

console.log("\n\n=== FINAL RESULTS JSON ===");
console.log(JSON.stringify(out, null, 2));
