// ─── Elements ───────────────────────────────────

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const capturePageBtn = document.getElementById("capturePage");
const captureSectionBtn = document.getElementById("captureSection");
const resultDiv = document.getElementById("result");
const serverUrlInput = document.getElementById("serverUrl");

// Load saved server URL
chrome.storage?.local?.get("serverUrl", (data) => {
  if (data.serverUrl) serverUrlInput.value = data.serverUrl;
});

serverUrlInput.addEventListener("change", () => {
  chrome.storage?.local?.set({ serverUrl: serverUrlInput.value });
  checkServer();
});

// ─── Server connection ──────────────────────────

async function checkServer() {
  try {
    const res = await fetch(`${serverUrlInput.value}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    if (data.status === "ok") {
      statusDot.classList.add("connected");
      statusText.textContent = "Server connected";
      capturePageBtn.disabled = false;
      captureSectionBtn.disabled = false;
      return true;
    }
  } catch {}
  statusDot.classList.remove("connected");
  statusText.textContent = "Server not running — run: bun server.ts";
  capturePageBtn.disabled = true;
  captureSectionBtn.disabled = true;
  return false;
}

checkServer();

// ─── Capture ────────────────────────────────────

capturePageBtn.addEventListener("click", () => capture("body"));
captureSectionBtn.addEventListener("click", () => capture("body")); // TODO: section selection

async function capture(selector) {
  const connected = await checkServer();
  if (!connected) return;

  capturePageBtn.disabled = true;
  captureSectionBtn.disabled = true;
  statusText.textContent = "Capturing...";
  resultDiv.className = "result";
  resultDiv.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    // Read the capture script content
    const scriptUrl = chrome.runtime.getURL("capture.js");
    const scriptRes = await fetch(scriptUrl);
    const scriptCode = await scriptRes.text();

    // Inject and execute the capture script, then call captureForDesign
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (code, sel) => {
        // Only inject once
        if (!window.__DSC_INJECTED__) {
          // Remove the auto-trigger line at the end before executing
          const cleanCode = code.replace(
            /captureForDesign\(\{\s*selector:\s*"body"\s*\}\);[\s\S]*?\}\)\(\);[\s]*$/,
            '})();'
          );
          const fn = new Function(cleanCode);
          fn();
          window.__DSC_INJECTED__ = true;
        }

        // Clear previous data
        window.__DSC_DATA__ = null;

        // Call captureForDesign
        if (window.figma?.captureForDesign) {
          window.figma.captureForDesign({ selector: sel });
        }

        // Wait for data
        for (let i = 0; i < 300; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (window.__DSC_DATA__) return window.__DSC_DATA__;
        }

        return null;
      },
      args: [scriptCode, selector],
      world: "MAIN",
    });

    const data = results[0]?.result;
    if (!data) throw new Error("Capture timed out — no data returned");

    // Send to local server
    statusText.textContent = "Sending to server...";
    const serverUrl = serverUrlInput.value;
    const res = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tab.url,
        data: data,
        title: tab.title,
        timestamp: Date.now(),
      }),
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);

    statusText.textContent = "Captured!";
    resultDiv.className = "result show success";
    resultDiv.innerHTML = `
      <strong>${result.site}</strong><br>
      Raw: ${result.raw} (${result.rawSize}KB)<br>
      Rendered: ${result.rendered} (${result.renderedSize}KB)
    `;
  } catch (err) {
    statusText.textContent = "Error";
    resultDiv.className = "result show error";
    resultDiv.textContent = err.message;
    console.error("[DSC Extension]", err);
  }

  capturePageBtn.disabled = false;
  captureSectionBtn.disabled = false;
}
