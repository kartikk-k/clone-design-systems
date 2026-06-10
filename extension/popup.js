// ─── Elements ───────────────────────────────────

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const capturePageBtn = document.getElementById("capturePage");
const captureSectionBtn = document.getElementById("captureSection");
const resultDiv = document.getElementById("result");
const serverUrlInput = document.getElementById("serverUrl");

const log = (...args) => console.log("[DG Popup]", ...args);

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
  statusText.textContent = "Server offline — run: npx designgrab";
  capturePageBtn.disabled = true;
  return false;
}

checkServer();

// ─── Capture ────────────────────────────────────

capturePageBtn.addEventListener("click", async () => {
  const connected = await checkServer();
  if (!connected) return;

  capturePageBtn.disabled = true;
  statusText.textContent = "Capturing page...";
  resultDiv.className = "result";
  resultDiv.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    log("Tab:", tab.id, tab.url);

    const serverUrl = serverUrlInput.value;
    const tabUrl = tab.url;
    const tabTitle = tab.title;

    // Run the capture script directly in the page
    // This inlines all CSS, strips scripts, and returns the clean HTML
    statusText.textContent = "Inlining stylesheets...";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const baseURI = document.baseURI;

        // --- helpers ---
        async function fetchText(url) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.text();
          } catch (e) {
            console.warn('[DG] Skipped (CORS):', url, e.message);
            return null;
          }
        }

        function absolutizeCssUrls(css, cssHref) {
          return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
            if (/^(data:|https?:|#)/i.test(ref)) return m;
            try { return 'url("' + new URL(ref, cssHref).href + '")'; }
            catch { return m; }
          });
        }

        // --- Clone the DOM ---
        console.log('[DG] Cloning DOM...');
        const doc = document.documentElement.cloneNode(true);

        // Remove <base> tags
        doc.querySelectorAll('base').forEach(b => b.remove());

        // 1. Inline external stylesheets
        console.log('[DG] Inlining stylesheets...');
        for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]) {
          const href = new URL(link.getAttribute('href'), baseURI).href;
          const css = await fetchText(href);
          if (css !== null) {
            const style = document.createElement('style');
            style.textContent = absolutizeCssUrls(css, href);
            link.replaceWith(style);
          }
        }

        // 2. STRIP all scripts (we don't need them for design extraction)
        console.log('[DG] Stripping scripts...');
        doc.querySelectorAll('script').forEach(s => s.remove());

        // 3. Strip noscript, iframes, browser extension artifacts
        doc.querySelectorAll('noscript, iframe, plasmo-csui').forEach(el => el.remove());

        // 4. Make links/image srcs absolute
        for (const el of [...doc.querySelectorAll('a[href]')]) {
          const href = el.getAttribute('href');
          if (href && !/^(data:|https?:|mailto:|tel:|#|javascript:)/i.test(href)) {
            try { el.setAttribute('href', new URL(href, baseURI).href); } catch {}
          }
        }
        for (const img of [...doc.querySelectorAll('img[src]')]) {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:') && !src.startsWith('http')) {
            try { img.setAttribute('src', new URL(src, baseURI).href); } catch {}
          }
        }
        // Strip srcset (broken relative refs)
        doc.querySelectorAll('img[srcset], source[srcset]').forEach(el => el.removeAttribute('srcset'));

        // 5. Remove meta tags that aren't needed
        doc.querySelectorAll('meta[http-equiv], meta[name="robots"], meta[name="googlebot"]').forEach(m => m.remove());

        // Assemble
        const html = '<!DOCTYPE html>\n' + doc.outerHTML;
        console.log('[DG] Capture complete:', (html.length / 1024).toFixed(0) + 'KB');
        return html;
      },
      world: "MAIN",
    });

    const capturedHtml = results[0]?.result;
    if (!capturedHtml) throw new Error("Capture returned empty");

    log("Captured HTML:", (capturedHtml.length / 1024).toFixed(0) + "KB");
    statusText.textContent = "Sending to server...";

    // Send to server
    const res = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tabUrl,
        data: capturedHtml,
        title: tabTitle,
        timestamp: Date.now(),
        captureType: "power", // New capture type
      }),
    });

    const result = await res.json();
    log("Server response:", result);
    if (result.error) throw new Error(result.error);

    statusText.textContent = "Captured!";
    resultDiv.className = "result show success";
    resultDiv.innerHTML = `
      <strong>${result.site}</strong><br>
      Saved: ${result.filename} (${result.sizeKB}KB)
    `;
    capturePageBtn.disabled = false;
    capturePageBtn.textContent = "Capture Again";
  } catch (err) {
    log("Capture error:", err.message, err.stack);
    statusText.textContent = "Error";
    resultDiv.className = "result show error";
    resultDiv.textContent = err.message;
    capturePageBtn.disabled = false;
  }
});

// Hide section button — not needed for power capture
captureSectionBtn.style.display = "none";
