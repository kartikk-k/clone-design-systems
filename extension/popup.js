// ─── Elements ───────────────────────────────────

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const capturePageBtn = document.getElementById("capturePage");
const captureSectionBtn = document.getElementById("captureSection");
const resultDiv = document.getElementById("result");
const serverUrlInput = document.getElementById("serverUrl");

const log = (...args) => console.log("[DSC Popup]", ...args);

chrome.storage?.local?.get("serverUrl", (data) => {
  if (data.serverUrl) serverUrlInput.value = data.serverUrl;
});

serverUrlInput.addEventListener("change", () => {
  chrome.storage?.local?.set({ serverUrl: serverUrlInput.value });
  checkServer();
});

// ─── Server check ───────────────────────────────

async function checkServer() {
  const url = `${serverUrlInput.value}/health`;
  log("Checking server at", url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    log("Server response:", data);
    if (data.status === "ok") {
      statusDot.classList.add("connected");
      statusText.textContent = "Server connected";
      capturePageBtn.disabled = false;
      return true;
    }
  } catch (e) {
    log("Server check failed:", e.message);
  }
  statusDot.classList.remove("connected");
  statusText.textContent = "Server offline — run: bun server.ts";
  capturePageBtn.disabled = true;
  return false;
}

checkServer();

// ─── Capture ────────────────────────────────────

capturePageBtn.addEventListener("click", async () => {
  const connected = await checkServer();
  if (!connected) return;

  capturePageBtn.disabled = true;
  statusText.textContent = "Capturing...";
  resultDiv.className = "result";
  resultDiv.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    log("Tab:", tab.id, tab.url);

    // Get the capture script
    const scriptUrl = chrome.runtime.getURL("capture.js");
    log("Fetching capture script from", scriptUrl);
    const scriptRes = await fetch(scriptUrl);
    const scriptCode = await scriptRes.text();
    log("Capture script loaded:", scriptCode.length, "chars");

    // Step 1: Clean up any previous injection completely
    log("Step 1: Cleaning up previous injection...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log("[DSC] Cleaning up previous injection...");
        // Reset all flags
        window.__DSC_DATA__ = null;
        window.__DSC_COPIED__ = false;
        window.__DSC_INJECTED__ = false;
        // Remove Figma toolbar
        const bar = document.getElementById("__figma_capture_toolbar_host__");
        if (bar) {
          bar.remove();
          console.log("[DSC] Removed existing Figma toolbar");
        } else {
          console.log("[DSC] No existing toolbar found");
        }
        // Reset figma object
        window.figma = undefined;
        console.log("[DSC] Cleanup complete");
      },
      world: "MAIN",
    });
    log("Cleanup done");

    // Step 2: Inject capture script fresh
    log("Step 2: Injecting capture script...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code) => {
        console.log("[DSC] Injecting capture script (" + code.length + " chars)...");
        try {
          const fn = new Function(code);
          fn();
          console.log("[DSC] Script injected successfully");
          console.log("[DSC] figma object:", typeof window.figma);
          console.log("[DSC] captureForDesign:", typeof window.figma?.captureForDesign);
        } catch (e) {
          console.error("[DSC] Script injection error:", e.message);
        }
      },
      args: [scriptCode],
      world: "MAIN",
    });
    log("Script injected");

    // Step 3: Poll for __DSC_DATA__
    log("Step 3: Polling for captured data...");
    const serverUrl = serverUrlInput.value;
    const tabId = tab.id;
    const tabUrl = tab.url;
    const tabTitle = tab.title;

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const data = window.__DSC_DATA__;
            const copied = window.__DSC_COPIED__;
            if (data) {
              console.log("[DSC] Data found! Size:", data.length, "chars");
              const captured = data;
              // Reset everything for next capture
              window.__DSC_DATA__ = null;
              window.__DSC_COPIED__ = false;
              window.__DSC_INJECTED__ = false;
              window.figma = undefined;
              // Remove toolbar
              const bar = document.getElementById("__figma_capture_toolbar_host__");
              if (bar) {
                bar.remove();
                console.log("[DSC] Toolbar removed after capture");
              }
              return captured;
            }
            // Log progress every 10 attempts
            if (window.__DSC_POLL_COUNT__ === undefined) window.__DSC_POLL_COUNT__ = 0;
            window.__DSC_POLL_COUNT__++;
            if (window.__DSC_POLL_COUNT__ % 50 === 0) {
              console.log("[DSC] Still waiting... attempt", window.__DSC_POLL_COUNT__, "| __DSC_DATA__:", !!data, "| __DSC_COPIED__:", copied);
            }
            return null;
          },
          world: "MAIN",
        });

        const data = results[0]?.result;
        if (data) {
          clearInterval(poll);
          log("Data received!", data.length, "chars");
          statusText.textContent = "Sending to server...";

          log("Sending to", serverUrl + "/capture");
          const res = await fetch(`${serverUrl}/capture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: tabUrl,
              data: data,
              title: tabTitle,
              timestamp: Date.now(),
            }),
          });

          const result = await res.json();
          log("Server response:", result);
          if (result.error) throw new Error(result.error);

          statusText.textContent = "Captured!";
          resultDiv.className = "result show success";
          resultDiv.innerHTML = `
            <strong>${result.site}</strong><br>
            Raw: ${result.raw} (${result.rawSize}KB)<br>
            Rendered: ${result.rendered} (${result.renderedSize}KB)
          `;
          capturePageBtn.disabled = false;
          capturePageBtn.textContent = "Capture Again";
          return;
        }
      } catch (e) {
        log("Poll error:", e.message);
        if (attempts > 600) {
          clearInterval(poll);
          statusText.textContent = "Timeout";
          capturePageBtn.disabled = false;
        }
      }

      if (attempts > 600) {
        clearInterval(poll);
        log("Polling timed out after 60 seconds");
        statusText.textContent = "Timeout — try again";
        capturePageBtn.disabled = false;
      }
    }, 100);
  } catch (err) {
    log("Capture error:", err.message, err.stack);
    statusText.textContent = "Error";
    resultDiv.className = "result show error";
    resultDiv.textContent = err.message;
    capturePageBtn.disabled = false;
  }
});

// Hide section button — Figma toolbar handles it
captureSectionBtn.style.display = "none";
