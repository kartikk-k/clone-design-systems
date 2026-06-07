// ─── Design tokens (Tailwind class strings, matches marketing site) ───

const BTN_PRIMARY =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-medium tracking-[-0.08px] text-black transition-opacity hover:opacity-90";
const BTN_SECONDARY =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3.5 text-xs font-medium tracking-[-0.08px] text-white/90 transition-colors hover:bg-white/12";
const BTN_ICON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white/90 transition-colors hover:bg-white/10";
const BTN_ACCENT =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-xs font-medium tracking-[-0.08px] text-white/90 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/12";

const TOAST_BASE =
  "fixed bottom-4 right-4 z-[100] max-w-[16rem] rounded-md border border-white/15 bg-[#141414] px-3 py-2 text-xs text-white/90 shadow-lg transition-all duration-200 ease-out";

const TAB_BASE =
  "tab -mb-px cursor-pointer border-b-2 border-b-transparent bg-transparent px-2.5 py-1.5 text-xs font-medium tracking-[-0.06px] transition-colors";

function tabClass(active) {
  return active
    ? `${TAB_BASE} border-b-white text-white`
    : `${TAB_BASE} text-white/40 hover:text-white/65`;
}

function setTabActiveState(tabsEl, tab) {
  tabsEl.querySelectorAll(".tab").forEach((t) => {
    const active = t.textContent.trim() === (tab === "pages" ? "Pages" : "design.md");
    t.classList.toggle("border-b-white", active);
    t.classList.toggle("text-white", active);
    t.classList.toggle("border-b-transparent", !active);
    t.classList.toggle("text-white/40", !active);
    t.classList.toggle("hover:text-white/65", !active);
  });
}

function clearTabActiveState(tabsEl) {
  tabsEl.querySelectorAll(".tab").forEach((t) => {
    t.classList.remove("border-b-white", "text-white");
    t.classList.add("border-b-transparent", "text-white/40", "hover:text-white/65");
  });
}

// ─── State ──────────────────────────────────────

let sites = [];
let currentSite = null;
let currentTab = "pages";

const API = window.location.origin;

// ─── Elements ───────────────────────────────────

const siteList = document.getElementById("siteList");
const welcomeView = document.getElementById("welcomeView");
const siteView = document.getElementById("siteView");
const topbarTitle = document.getElementById("topbarTitle");
const topbarPage = document.getElementById("topbarPage");
const topbarActions = document.getElementById("topbarActions");
const siteContent = document.getElementById("siteContent");
const toast = document.getElementById("toast");

toast.className = `${TOAST_BASE} pointer-events-none translate-y-4 opacity-0`;

// ─── Init ───────────────────────────────────────

loadSites();

// Poll for new captures every 5s
setInterval(loadSites, 5000);

// ─── API ────────────────────────────────────────

async function loadSites() {
  try {
    const res = await fetch(`${API}/api/sites`);
    const data = await res.json();
    const prev = JSON.stringify(sites.map((s) => s.name));
    sites = data.sites;
    const next = JSON.stringify(sites.map((s) => s.name));
    if (prev !== next) renderSidebar();
    // If current site data changed, refresh detail
    if (currentSite) {
      const updated = sites.find((s) => s.name === currentSite.name);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentSite)) {
        currentSite = updated;
        renderSiteDetail();
      }
    }
  } catch (e) {
    console.error("Failed to load sites:", e);
  }
}

async function loadDesignMd(siteName) {
  try {
    const res = await fetch(`${API}/api/sites/${siteName}/design.md`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function generateDesignMd(siteName) {
  try {
    const res = await fetch(`${API}/api/sites/${siteName}/generate-design-md`, { method: "POST" });
    if (!res.ok) throw new Error("Generation failed");
    const data = await res.json();
    return data;
  } catch (e) {
    showToast("Failed to generate design.md: " + e.message, "error");
    return null;
  }
}

async function deleteCapture(siteName, filename) {
  try {
    const res = await fetch(`${API}/api/sites/${siteName}/pages/${filename}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    return true;
  } catch (e) {
    showToast("Failed to delete: " + e.message, "error");
    return false;
  }
}

// ─── Sidebar ────────────────────────────────────

function renderSidebar() {
  siteList.innerHTML = "";

  if (sites.length === 0) {
    siteList.innerHTML = `<div class="rounded-md border border-dashed border-white/10 px-2 py-2.5 text-[10px] leading-snug text-white/38">No sites yet. Capture with the extension.</div>`;
    return;
  }

  for (const site of sites) {
    const btn = document.createElement("button");
    const active = currentSite?.name === site.name;
    btn.type = "button";
    btn.className = [
      "flex w-full items-center gap-1.5 rounded-sm py-1.5 pl-1.5 pr-1.5 text-left transition-colors",
      active
        ? "border-l-2 border-white bg-white/[0.06] text-white"
        : "border-l-2 border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/90",
    ].join(" ");
    btn.innerHTML = `
      <span class="min-w-0 flex-1 truncate font-mono text-[11px] leading-none tracking-tight">${site.name}</span>
      <span class="shrink-0 rounded bg-white/[0.06] px-1 py-px text-[10px] font-medium tabular-nums text-white/40">${site.pages.length}</span>
    `;
    btn.onclick = () => selectSite(site);
    siteList.appendChild(btn);
  }
}

// ─── Site Detail ────────────────────────────────

function selectSite(site) {
  currentSite = site;
  currentTab = "pages";
  renderSidebar();
  showSiteView();
  renderSiteDetail();
}

function showSiteView() {
  welcomeView.classList.add("hidden");
  siteView.classList.remove("hidden");
}

function showWelcome() {
  currentSite = null;
  welcomeView.classList.remove("hidden");
  siteView.classList.add("hidden");
  renderSidebar();
}

function renderSiteDetail() {
  const site = currentSite;
  if (!site) return;

  topbarTitle.textContent = site.name;
  topbarPage.textContent = currentTab === "pages" ? "Pages" : "design.md";

  // Topbar actions
  topbarActions.innerHTML = `
    <button type="button" class="${BTN_ICON}" title="Refresh" onclick="refreshSite()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </button>
  `;

  // Content
  siteContent.innerHTML = "";

  // Site header
  const header = document.createElement("div");
  header.className = "mb-4 flex items-center gap-3";
  header.innerHTML = `
    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.04] font-mono text-[11px] text-white/50">${site.name[0].toUpperCase()}</div>
    <div class="min-w-0">
      <h2 class="truncate font-mono text-[13px] font-medium tracking-[-0.12px] text-white">${site.name}</h2>
      <div class="mt-0.5 text-[10px] text-white/38">${site.pages.length} page${site.pages.length !== 1 ? "s" : ""}${site.hasDesignMd ? " · design.md" : ""}</div>
    </div>
  `;
  siteContent.appendChild(header);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "tabs -mb-px mb-4 flex gap-1 border-b border-white/15";
  tabs.innerHTML = `
    <button type="button" class="${tabClass(currentTab === "pages")}" onclick="switchTab('pages')">Pages</button>
    <button type="button" class="${tabClass(currentTab === "design-md")}" onclick="switchTab('design-md')">design.md</button>
  `;
  siteContent.appendChild(tabs);

  if (currentTab === "pages") {
    renderPagesTab(site);
  } else {
    renderDesignMdTab(site);
  }
}

function switchTab(tab) {
  currentTab = tab;
  topbarPage.textContent = tab === "pages" ? "Pages" : "design.md";
  // Re-render content below tabs
  const tabs = siteContent.querySelector(".tabs");
  // Remove everything after tabs
  while (tabs.nextSibling) tabs.nextSibling.remove();
  // Update tab active state
  setTabActiveState(tabs, tab);

  if (tab === "pages") {
    renderPagesTab(currentSite);
  } else {
    renderDesignMdTab(currentSite);
  }
}

// ─── Pages tab ──────────────────────────────────

function renderPagesTab(site) {
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3";

  for (const page of site.pages) {
    const card = document.createElement("div");
    card.className =
      "group cursor-pointer overflow-hidden rounded-[5px] border border-white/15 bg-white/[0.04] transition-colors hover:border-white/25";

    const previewUrl = `${API}/api/sites/${site.name}/preview/${page.rendered}`;
    const slug = page.rendered.replace("rendered-", "").replace(".html", "");

    card.innerHTML = `
      <div class="page-card-preview relative h-28 overflow-hidden bg-white/[0.06]">
        <iframe src="${previewUrl}" loading="lazy" sandbox="allow-same-origin" title="Preview ${slug}"></iframe>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-white/10 px-2 py-1.5">
        <span class="min-w-0 truncate font-mono text-[11px] text-white/85">${slug}</span>
        <span class="shrink-0 text-[10px] tabular-nums text-white/35">${page.captureKB || "?"}KB</span>
      </div>
    `;

    card.onclick = () => openPagePreview(site.name, page, slug);
    grid.appendChild(card);
  }

  siteContent.appendChild(grid);
}

// ─── Page preview ───────────────────────────────

function openPagePreview(siteName, page, slug) {
  currentTab = "preview";
  topbarPage.textContent = slug;

  const tabs = siteContent.querySelector(".tabs");
  while (tabs.nextSibling) tabs.nextSibling.remove();

  clearTabActiveState(tabs);

  const panel = document.createElement("div");
  panel.className = "block";

  const toolbar = document.createElement("div");
  toolbar.className = "mb-3 flex flex-wrap items-center gap-1.5";
  toolbar.innerHTML = `
    <button type="button" class="${BTN_SECONDARY}" onclick="switchTab('pages')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>
    <span class="grow"></span>
    <button type="button" class="${BTN_SECONDARY}" onclick="window.open('${API}/api/sites/${siteName}/preview/${page.rendered}', '_blank')">
      Open in new tab
    </button>
    <button type="button" class="${BTN_SECONDARY} text-red-400 hover:text-red-300" onclick="confirmDeletePage('${siteName}', '${page.capture}')">
      Delete
    </button>
  `;
  panel.appendChild(toolbar);

  const frame = document.createElement("div");
  frame.className =
    "page-preview-frame h-[calc(100vh-9.5rem)] w-full overflow-hidden rounded-[5px] border border-white/15 bg-white";
  frame.innerHTML = `<iframe src="${API}/api/sites/${siteName}/preview/${page.rendered}" title="Full preview ${slug}" class="h-full w-full border-0"></iframe>`;
  panel.appendChild(frame);

  siteContent.appendChild(panel);
}

async function confirmDeletePage(siteName, captureFile) {
  if (!confirm(`Delete capture "${captureFile}"? This also removes the rendered file.`)) return;
  const ok = await deleteCapture(siteName, captureFile);
  if (ok) {
    showToast("Capture deleted", "success");
    await loadSites();
    const updated = sites.find((s) => s.name === siteName);
    if (updated) {
      currentSite = updated;
      currentTab = "pages";
      renderSiteDetail();
    } else {
      showWelcome();
    }
  }
}

// ─── Design.md tab ──────────────────────────────

async function renderDesignMdTab(site) {
  const container = document.createElement("div");
  container.className = "block";

  const toolbar = document.createElement("div");
  toolbar.className = "mb-3 flex flex-wrap items-center gap-1.5";
  toolbar.innerHTML = `<span class="ml-auto text-[10px] text-white/35">Loading…</span>`;
  container.appendChild(toolbar);

  const content = document.createElement("div");
  content.className =
    "design-md-content md-rendered max-h-[calc(100vh-9.5rem)] overflow-y-auto rounded-[5px] border border-white/15 bg-white/[0.04] p-3.5 font-mono text-[11px] leading-relaxed text-white/55";
  content.textContent = "Loading...";
  container.appendChild(content);

  siteContent.appendChild(container);

  const md = await loadDesignMd(site.name);

  if (md) {
    toolbar.innerHTML = `
      <button type="button" class="${BTN_PRIMARY}" onclick="copyDesignMd('${site.name}')">Copy</button>
      <button type="button" class="${BTN_SECONDARY}" onclick="downloadDesignMd('${site.name}')">Download</button>
      <button type="button" class="${BTN_ACCENT}" onclick="regenerateDesignMd('${site.name}')">Regenerate</button>
      <span class="ml-auto text-[10px] tabular-nums text-white/35">${(md.length / 1024).toFixed(1)} KB</span>
    `;
    content.className =
      "design-md-content md-rendered max-h-[calc(100vh-9.5rem)] overflow-y-auto rounded-[5px] border border-white/15 bg-white/[0.04] p-3.5 text-[11px] leading-relaxed text-white/55";
    content.innerHTML = renderMarkdown(md);
  } else {
    toolbar.innerHTML = `
      <button type="button" class="${BTN_PRIMARY}" onclick="regenerateDesignMd('${site.name}')">Generate</button>
      <span class="ml-auto text-[10px] text-white/35">No file</span>
    `;
    content.className =
      "design-md-content max-h-[calc(100vh-9.5rem)] overflow-y-auto rounded-[5px] border border-white/15 bg-white/[0.04] p-3.5 text-[11px] text-white/45";
    content.innerHTML = `
      <div class="py-6 text-center text-[11px] leading-relaxed text-white/40">
        <p class="mb-2">No <code class="rounded border border-white/15 bg-white/[0.06] px-1 py-px font-mono text-[10px] text-white/65">design.md</code> yet.</p>
        <p><strong class="text-white/80">Generate</strong> from captures or add <code class="rounded border border-white/15 bg-white/[0.06] px-1 py-px font-mono text-[10px] text-white/65">.data/${site.name}/design.md</code></p>
      </div>
    `;
  }
}

async function copyDesignMd(siteName) {
  const md = await loadDesignMd(siteName);
  if (!md) return showToast("No design.md to copy", "error");
  await navigator.clipboard.writeText(md);
  showToast("Copied design.md to clipboard", "success");
}

function downloadDesignMd(siteName) {
  const a = document.createElement("a");
  a.href = `${API}/api/sites/${siteName}/design.md`;
  a.download = `${siteName}-design.md`;
  a.click();
}

async function regenerateDesignMd(siteName) {
  showToast("Generating design.md...", "success");
  const result = await generateDesignMd(siteName);
  if (result) {
    showToast(`Generated design.md (${result.sizeKB}KB)`, "success");
    await loadSites();
    if (currentSite?.name === siteName) {
      currentSite = sites.find((s) => s.name === siteName) || currentSite;
      switchTab("design-md");
    }
  }
}

async function refreshSite() {
  await loadSites();
  if (currentSite) {
    const updated = sites.find((s) => s.name === currentSite.name);
    if (updated) {
      currentSite = updated;
      renderSiteDetail();
    }
  }
}

// ─── Markdown renderer (simple) ─────────────────

function renderMarkdown(md) {
  let html = escapeHtml(md);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Tables
  html = html.replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)/g, (table) => {
    const rows = table.trim().split("\n");
    if (rows.length < 2) return table;

    const headers = rows[0].split("|").filter((c) => c.trim());
    const body = rows.slice(2);

    let t = "<table><thead><tr>";
    for (const h of headers) t += `<th>${h.trim()}</th>`;
    t += "</tr></thead><tbody>";

    for (const row of body) {
      const cells = row.split("|").filter((c) => c.trim());
      t += "<tr>";
      for (const c of cells) t += `<td>${c.trim()}</td>`;
      t += "</tr>";
    }
    t += "</tbody></table>";
    return t;
  });

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");

  // Paragraphs — wrap loose lines
  html = html.replace(/\n\n/g, "</p><p>");

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Toast ──────────────────────────────────────

function showToast(message, type = "success") {
  toast.textContent = message;
  const accent = type === "success" ? "border-l-2 border-l-emerald-400/90" : "border-l-2 border-l-red-500/90";
  toast.className = `${TOAST_BASE} pointer-events-auto translate-y-0 opacity-100 ${accent}`;
  setTimeout(() => {
    toast.className = `${TOAST_BASE} pointer-events-none translate-y-4 opacity-0`;
  }, 3000);
}
