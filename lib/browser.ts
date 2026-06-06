import { chromium } from "playwright";
import { INJECT_SCRIPT } from "./inject-script.ts";
import { info, success, warn } from "./cli.ts";

export async function openBrowserAndWaitForCopy(url: string): Promise<void> {
  info("Launching Chromium browser...");
  const browser = await chromium.launch({
    headless: false,
  });
  success("Browser launched.");

  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  info(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: "networkidle" });
  success("Page loaded (networkidle).");

  info("Injecting Figma capture script...");
  await page.evaluate(INJECT_SCRIPT);
  success("Capture script injected. Toolbar should be visible.");

  info("Waiting for you to capture the page...");
  info("(Auto-detects clipboard write, OR press Enter in this terminal to continue)");

  // Race: auto-detect clipboard write vs manual Enter press
  const autoDetect = page
    .waitForFunction(
      () => (globalThis as any).__DSC_COPIED__ === true,
      null,
      { timeout: 0, polling: 1000 }
    )
    .then(() => "auto" as const)
    .catch(() => "browser-closed" as const);

  const manualContinue = new Promise<"manual">((resolve) => {
    // Run prompt in a microtask so it doesn't block the event loop setup
    setTimeout(() => {
      prompt("  \x1b[2mPress Enter once you've copied the page content...\x1b[0m");
      resolve("manual");
    }, 0);
  });

  const result = await Promise.race([autoDetect, manualContinue]);

  if (result === "auto") {
    success("Clipboard write auto-detected!");
  } else if (result === "manual") {
    success("Manual continue — assuming content was copied.");
  } else {
    warn("Browser was closed before copy was detected. Continuing anyway...");
  }

  // Close browser if still open
  try {
    await browser.close();
    success("Browser closed.");
  } catch {
    info("Browser already closed.");
  }
}
