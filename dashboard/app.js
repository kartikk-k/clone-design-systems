// ─── Design tokens (Retool reference — exact colors, hairline borders, radii) ───

const BTN_PRIMARY = "btn-retool-primary";
const BTN_SECONDARY = "btn-retool-secondary";
const BTN_ICON = "btn-retool-icon";
const BTN_ACCENT = "btn-retool-dark";
const BTN_DANGER = "btn-retool-danger";

const TOAST_BASE = "toast-retool";

const TAB_BASE = "tab tab-retool";

function tabClass(active) {
  return active ? `${TAB_BASE} tab-retool-active` : `${TAB_BASE} tab-retool-inactive`;
}

function setTabActiveState(tabsEl, tab) {
  const tabLabels = { "design-md": "DESIGN.MD", "components": "COMPONENTS", "pages": "PAGES" };
  const activeLabel = tabLabels[tab] || tab.toUpperCase();
  tabsEl.querySelectorAll(".tab").forEach((t) => {
    const active = t.textContent.trim() === activeLabel;
    t.classList.toggle("tab-retool-active", active);
    t.classList.toggle("tab-retool-inactive", !active);
  });
}

function clearTabActiveState(tabsEl) {
  tabsEl.querySelectorAll(".tab").forEach((t) => {
    t.classList.remove("tab-retool-active");
    t.classList.add("tab-retool-inactive");
  });
}

// ─── State ──────────────────────────────────────

let sites = [];
let currentSite = null;
let currentTab = "design-md";

const API = window.location.origin;

// ─── Elements ───────────────────────────────────

const siteList = document.getElementById("siteList");
const welcomeView = document.getElementById("welcomeView");
const welcomeContent = document.getElementById("welcomeContent");
const siteView = document.getElementById("siteView");
const topbarTitle = document.getElementById("topbarTitle");
const topbarPage = document.getElementById("topbarPage");
const topbarSep = document.getElementById("topbarSep");
const topbarActions = document.getElementById("topbarActions");
const siteContent = document.getElementById("siteContent");
const toast = document.getElementById("toast");

let welcomeFilter = "";

toast.className = `${TOAST_BASE} toast-retool--hidden`;

// ─── Routing ────────────────────────────────────

function navigate(path, replace = false) {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;

  // /sites/:name or /sites/:name/pages or /sites/:name/components
  const siteMatch = path.match(/^\/sites\/([^/]+)(\/pages|\/components)?$/);

  if (siteMatch) {
    const siteName = decodeURIComponent(siteMatch[1]);
    const tab = siteMatch[2] === "/pages" ? "pages" : siteMatch[2] === "/components" ? "components" : "design-md";
    const site = sites.find((s) => s.name === siteName);
    if (site) {
      currentSite = site;
      currentTab = tab;
      renderSidebar();
      showSiteView();
      renderSiteDetail();
      return;
    }
  }

  // Default: dashboard
  showWelcomeView();
}

// Show welcome without pushing state (used by handleRoute)
function showWelcomeView() {
  currentSite = null;
  topbarTitle.textContent = "";
  topbarSep.style.display = "none";
  topbarPage.textContent = "Dashboard";
  topbarActions.innerHTML = "";
  welcomeView.classList.remove("hidden");
  siteView.classList.add("hidden");
  renderSidebar();
  renderWelcome();
}

window.addEventListener("popstate", handleRoute);

// ─── Init ───────────────────────────────────────

loadSites().then(() => {
  handleRoute();
});

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
    if (prev !== next) {
      renderSidebar();
      // Re-render welcome if visible
      if (!currentSite) renderWelcome();
    }
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

// ─── Welcome dashboard ─────────────────────────

function renderWelcome() {
  const totalPages = sites.reduce((sum, s) => sum + s.pages.length, 0);
  const withDesign = sites.filter((s) => s.hasDesignMd).length;
  const filtered = welcomeFilter
    ? sites.filter((s) => s.name.toLowerCase().includes(welcomeFilter.toLowerCase()))
    : sites;

  welcomeContent.innerHTML = `
    <div class="welcome-header">
      <h1 class="welcome-title">Dashboard</h1>
      <p class="welcome-subtitle">Manage captured sites and design systems</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${sites.length}</div>
        <div class="stat-label">Sites</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalPages}</div>
        <div class="stat-label">Pages captured</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${withDesign}</div>
        <div class="stat-label">design.md ready</div>
      </div>
    </div>

    <div class="section-label">All sites</div>
    <div class="welcome-search-wrap">
      <svg class="welcome-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="welcome-search" placeholder="Filter sites..." id="welcomeSearch" value="${welcomeFilter}" />
    </div>
    <div class="welcome-grid" id="welcomeGrid"></div>
  `;

  const grid = document.getElementById("welcomeGrid");
  const searchInput = document.getElementById("welcomeSearch");

  searchInput.addEventListener("input", (e) => {
    welcomeFilter = e.target.value;
    renderWelcomeGrid(grid);
  });

  renderWelcomeGrid(grid);
}

function renderWelcomeGrid(grid) {
  const filtered = welcomeFilter
    ? sites.filter((s) => s.name.toLowerCase().includes(welcomeFilter.toLowerCase()))
    : sites;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="welcome-empty">${sites.length === 0 ? "No sites yet. Use the extension to capture." : "No sites match your filter."}</div>`;
    return;
  }

  grid.innerHTML = "";
  for (const site of filtered) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "welcome-site-card";

    const dotClass = site.hasDesignMd ? "welcome-card-dot--ready" : "welcome-card-dot--empty";
    const statusText = site.hasDesignMd ? "design.md" : "No design.md";

    card.innerHTML = `
      <div class="welcome-card-avatar">${site.name.slice(0, 2).toUpperCase()}</div>
      <div class="welcome-card-info">
        <div class="welcome-card-name">${site.name}</div>
        <div class="welcome-card-meta">
          ${site.pages.length} page${site.pages.length !== 1 ? "s" : ""}
          <span class="welcome-card-dot ${dotClass}"></span>
          ${statusText}
        </div>
      </div>
    `;
    card.onclick = () => selectSite(site);
    grid.appendChild(card);
  }
}

// ─── Sidebar ────────────────────────────────────

function renderSidebar() {
  siteList.innerHTML = "";

  if (sites.length === 0) {
    siteList.innerHTML = `<div class="empty-sites-hint">No sites yet. Capture with the extension.</div>`;
    return;
  }

  for (const site of sites) {
    const btn = document.createElement("button");
    const active = currentSite?.name === site.name;
    btn.type = "button";
    btn.className = ["site-row", active ? "site-row-active" : ""].filter(Boolean).join(" ");
    btn.innerHTML = `
      <span class="site-row-name">${site.name}</span>
      <span class="site-count-badge">${site.pages.length}</span>
    `;
    btn.onclick = () => selectSite(site);
    siteList.appendChild(btn);
  }
}

// ─── Site Detail ────────────────────────────────

function selectSite(site) {
  navigate(`/sites/${encodeURIComponent(site.name)}`);
}

function showSiteView() {
  welcomeView.classList.add("hidden");
  siteView.classList.remove("hidden");
}

function showWelcome() {
  navigate("/");
}

function renderSiteDetail() {
  const site = currentSite;
  if (!site) return;

  topbarTitle.textContent = site.name;
  topbarSep.style.display = "";
  topbarPage.textContent = currentTab === "pages" ? "Pages" : "design.md";

  // Topbar actions
  topbarActions.innerHTML = `
    <button type="button" class="${BTN_ICON}" style="width:28px;height:28px;" title="Refresh" onclick="refreshSite()">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </button>
  `;

  // Content
  siteContent.innerHTML = "";

  // Hero section — prominent site name + status + primary actions
  const hero = document.createElement("div");
  hero.className = "site-hero";

  const pageCount = site.pages.length;
  const statusHtml = site.hasDesignMd
    ? `<span class="status-badge status-badge--ready"><span class="status-badge-dot"></span>design.md ready</span>`
    : `<span class="status-badge status-badge--empty"><span class="status-badge-dot"></span>No design.md</span>`;

  const iconBtnStyle = `${BTN_ICON}`;

  hero.innerHTML = `
    <div class="site-hero-top">
      <div class="site-hero-avatar">${site.name.slice(0, 2).toUpperCase()}</div>
      <div class="site-hero-icon-actions">
        <button type="button" class="${iconBtnStyle}" title="Download design.md" onclick="downloadDesignMd('${site.name}')" ${site.hasDesignMd ? "" : 'style="display:none"'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button type="button" class="${iconBtnStyle}" title="Delete site" onclick="confirmDeleteSite('${site.name}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M2.75 4.75H15.25"/><path d="M6.75 4.75V2.75C6.75 2.2 7.198 1.75 7.75 1.75H10.25C10.802 1.75 11.25 2.2 11.25 2.75V4.75"/><path d="M7.375 8.75L7.59219 13.25"/><path d="M10.625 8.75L10.4078 13.25"/><path d="M13.6977 7.75L13.35 14.35C13.294 15.4201 12.416 16.25 11.353 16.25H6.64804C5.58404 16.25 4.70703 15.42 4.65103 14.35L4.30334 7.75"/></g></svg>
        </button>
      </div>
    </div>
    <h2 class="site-hero-name">${site.name}</h2>
    <div class="site-hero-meta">${pageCount} page${pageCount !== 1 ? "s" : ""} captured &nbsp;·&nbsp; ${statusHtml}</div>
    <div class="site-hero-actions" id="heroActions"></div>
  `;
  siteContent.appendChild(hero);

  // Fill hero actions — only primary CTAs
  const heroActions = document.getElementById("heroActions");
  const heroBtn = 'style="height:32px;font-size:12px;padding:0 16px;"';
  if (site.hasDesignMd) {
    heroActions.innerHTML = `
      <button type="button" class="${BTN_PRIMARY}" ${heroBtn} onclick="copyDesignMd('${site.name}')">Copy design.md</button>
      <button type="button" class="${BTN_ACCENT}" ${heroBtn} onclick="copyAgentPrompt('${site.name}')">Generate with agent</button>
    `;
  } else {
    heroActions.innerHTML = `
      <button type="button" class="${BTN_PRIMARY}" ${heroBtn} onclick="copyAgentPrompt('${site.name}')">Generate with agent</button>
    `;
  }

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "tabs tabs-bar-retool";
  tabs.innerHTML = `
    <button type="button" class="${tabClass(currentTab === "design-md")}" onclick="switchTab('design-md')">design.md</button>
    <button type="button" class="${tabClass(currentTab === "components")}" onclick="switchTab('components')">Components</button>
    <button type="button" class="${tabClass(currentTab === "pages")}" onclick="switchTab('pages')">Pages</button>
  `;
  siteContent.appendChild(tabs);

  if (currentTab === "pages") {
    renderPagesTab(site);
  } else if (currentTab === "components") {
    renderComponentsTab(site);
  } else {
    renderDesignMdTab(site);
  }
}

function switchTab(tab) {
  // Update URL without full re-render
  const siteName = encodeURIComponent(currentSite.name);
  const pathSuffix = tab === "pages" ? "/pages" : tab === "components" ? "/components" : "";
  history.pushState(null, "", `/sites/${siteName}${pathSuffix}`);

  currentTab = tab;
  const tabLabels = { "design-md": "design.md", "components": "Components", "pages": "Pages" };
  topbarPage.textContent = tabLabels[tab] || tab;
  // Re-render content below tabs
  const tabs = siteContent.querySelector(".tabs");
  // Remove everything after tabs
  while (tabs.nextSibling) tabs.nextSibling.remove();
  // Update tab active state
  setTabActiveState(tabs, tab);

  if (tab === "pages") {
    renderPagesTab(currentSite);
  } else if (tab === "components") {
    renderComponentsTab(currentSite);
  } else {
    renderDesignMdTab(currentSite);
  }
}

// ─── Pages tab ──────────────────────────────────

function renderPagesTab(site) {
  const grid = document.createElement("div");
  grid.className = "page-grid-retool";

  for (const page of site.pages) {
    const card = document.createElement("div");
    card.className = "page-card-retool group";

    const previewUrl = `${API}/api/sites/${site.name}/preview/${page.capture}`;
    const slug = page.slug;

    card.innerHTML = `
      <div class="page-card-preview page-card-preview-wrap">
        <iframe src="${previewUrl}" loading="lazy" sandbox="allow-same-origin allow-scripts" title="Preview ${slug}"></iframe>
      </div>
      <div class="page-card-footer">
        <span class="page-card-slug">${slug}</span>
        <span class="page-card-kb">${page.captureKB || "?"}KB</span>
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

  // Remove everything after the hero (tabs + content below)
  const hero = siteContent.querySelector(".site-hero");
  const tabs = siteContent.querySelector(".tabs");
  while (tabs && tabs.nextSibling) tabs.nextSibling.remove();

  if (tabs) clearTabActiveState(tabs);

  const panel = document.createElement("div");
  panel.className = "panel-block";

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar-retool";
  toolbar.innerHTML = `
    <button type="button" class="${BTN_SECONDARY}" onclick="switchTab('pages')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>
    <span class="toolbar-spacer"></span>
    <button type="button" class="${BTN_SECONDARY}" onclick="window.open('${API}/api/sites/${siteName}/preview/${page.capture}', '_blank')">
      Open in new tab
    </button>
    <button type="button" class="${BTN_DANGER}" onclick="confirmDeletePage('${siteName}', '${page.capture}')">
      Delete
    </button>
  `;
  panel.appendChild(toolbar);

  const frame = document.createElement("div");
  frame.className = "preview-frame-retool page-preview-frame";
  frame.innerHTML = `<iframe src="${API}/api/sites/${siteName}/preview/${page.capture}" title="Full preview ${slug}"></iframe>`;
  panel.appendChild(frame);

  siteContent.appendChild(panel);
}

async function confirmDeleteSite(siteName) {
  if (!confirm(`Delete "${siteName}" and all its captures? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/api/sites/${encodeURIComponent(siteName)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast(`Deleted ${siteName}`, "success");
    await loadSites();
    showWelcome();
  } catch (e) {
    showToast("Failed to delete: " + e.message, "error");
  }
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
  container.className = "panel-block";

  const content = document.createElement("div");
  content.className = "design-md-content design-md-box md-rendered";
  content.innerHTML = `<span class="md-section-meta">Loading...</span>`;
  container.appendChild(content);

  siteContent.appendChild(container);

  const md = await loadDesignMd(site.name);

  if (md) {
    // Section header with secondary actions + size info
    const header = document.createElement("div");
    header.className = "md-section-header";
    header.innerHTML = `
      <span class="md-section-label">design.md</span>
      <span class="md-section-meta">${(md.length / 1024).toFixed(1)} KB</span>
    `;
    container.insertBefore(header, content);

    content.className = "design-md-content design-md-box md-rendered";
    content.innerHTML = renderMarkdown(md);
  } else {
    content.className = "panel-block";
    content.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </div>
      <div class="empty-state-title">No design.md yet</div>
      <div class="empty-state-desc">Generate a complete design system specification from your captured pages. Copy the agent prompt and paste it into Claude or any AI agent.</div>
      <div class="empty-state-actions">
        <button type="button" class="${BTN_PRIMARY}" onclick="copyAgentPrompt('${site.name}')">Generate with agent</button>
      </div>
    `;
    content.appendChild(empty);
  }
}

// ─── Components tab ──────────────────────────────

async function renderComponentsTab(site) {
  const container = document.createElement("div");
  container.className = "panel-block";

  const content = document.createElement("div");
  content.innerHTML = `<span class="md-section-meta">Loading...</span>`;
  container.appendChild(content);
  siteContent.appendChild(container);

  // Try to load components-tailwind.html
  try {
    const res = await fetch(`${API}/api/sites/${site.name}/components`);
    if (res.ok) {
      const html = await res.text();

      // Section header
      const header = document.createElement("div");
      header.className = "md-section-header";
      header.innerHTML = `
        <span class="md-section-label">Components</span>
        <span class="md-section-meta">${(html.length / 1024).toFixed(1)} KB</span>
      `;
      container.insertBefore(header, content);

      // Render in iframe for proper isolation (Tailwind needs its own context)
      content.className = "preview-frame-retool";
      content.style.height = "calc(100vh - 12rem)";
      content.innerHTML = `<iframe srcdoc="${html.replace(/"/g, '&quot;')}" style="width:100%;height:100%;border:0;border-radius:6px;"></iframe>`;
    } else {
      content.className = "panel-block";
      content.innerHTML = "";

      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-state-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div class="empty-state-title">No components yet</div>
        <div class="empty-state-desc">Generate components from captured pages using the agent prompt. The agent will create a Tailwind component library from your captures.</div>
        <div class="empty-state-actions">
          <button type="button" class="${BTN_PRIMARY}" onclick="copyAgentPrompt('${site.name}')">Generate with agent</button>
        </div>
      `;
      content.appendChild(empty);
    }
  } catch (e) {
    content.innerHTML = `<span class="md-section-meta">Error: ${e.message}</span>`;
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

async function copyAgentPrompt(siteName) {
  try {
    const res = await fetch(`${API}/api/sites/${siteName}/agent-prompt`);
    if (!res.ok) throw new Error("Failed to get prompt");
    const data = await res.json();
    await navigator.clipboard.writeText(data.prompt);
    showToast("Agent prompt copied — paste into any AI agent", "success");
  } catch (e) {
    showToast("Failed: " + e.message, "error");
  }
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
  const accent =
    type === "success" ? "toast-retool--accent-success" : "toast-retool--accent-error";
  toast.className = `${TOAST_BASE} toast-retool--visible ${accent}`;
  setTimeout(() => {
    toast.className = `${TOAST_BASE} toast-retool--hidden`;
  }, 3000);
}
