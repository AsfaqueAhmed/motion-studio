import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5174/?device=wasm&dtype=q8";
const label = process.argv[3] || "run";
const profileDir = process.argv[4] || `/tmp/pw-profile-${label}`;

const context = await chromium.launchPersistentContext(profileDir, {
  args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan"],
});
const page = await context.newPage();

let bytesFromHeaders = 0;
const fileSizes = {};

page.on("console", (msg) => console.log(`  [console] ${msg.text()}`));
page.on("pageerror", (err) => console.log(`  [pageerror] ${err}`));
page.on("requestfailed", (req) =>
  console.log(`  [requestfailed] ${req.url()} — ${req.failure()?.errorText}`),
);
page.on("response", async (res) => {
  const u = res.url();
  if (/huggingface\.co|hf\.co|jsdelivr/.test(u)) {
    const len = Number((await res.allHeaders())["content-length"] || 0);
    if (len > 1024) {
      const name = u.split("/").pop().split("?")[0];
      fileSizes[name] = len;
      bytesFromHeaders += len;
    }
    console.log(`  [response] ${res.status()} len=${len} ${u.slice(0, 100)}`);
  }
});

console.log(`\n=== ${label}: ${url} (profile=${profileDir}) ===`);
const t0 = Date.now();
await page.goto(url, { timeout: 300000, waitUntil: "domcontentloaded" });
await page
  .waitForFunction("window.__SPIKE_DONE__ === true", undefined, { timeout: 300000, polling: 1000 })
  .catch((e) => console.log(`  [timeout] spike did not finish in time: ${e}`));
const wallMs = Date.now() - t0;
const results = await page.evaluate("window.__SPIKE_RESULTS__");
results.bytesFromResponseHeaders = bytesFromHeaders;
results.fileSizes = fileSizes;
console.log(`  wallClockMs=${wallMs}`);
console.log(JSON.stringify(results, null, 2));

await context.close();
