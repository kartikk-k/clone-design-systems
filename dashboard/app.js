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
    siteList.innerHTML = `<div style="padding: 8px; font-size: 12px; color: var(--text-muted);">No captures yet.<br>Use the Chrome extension to capture a site.</div>`;
    return;
  }

  for (const site of sites) {
    const btn = document.createElement("button");
    btn.className = "site-item" + (currentSite?.name === site.name ? " active" : "");
    btn.innerHTML = `
      <span class="site-icon">${site.name[0].toUpperCase()}</span>
      <span class="site-name">${site.name}</span>
      <span class="page-count">${site.pages.length}</span>
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
  welcomeView.style.display = "none";
  siteView.style.display = "flex";
  siteView.style.flexDirection = "column";
}

function showWelcome() {
  currentSite = null;
  welcomeView.style.display = "flex";
  siteView.style.display = "none";
  renderSidebar();
}

function renderSiteDetail() {
  const site = currentSite;
  if (!site) return;

  topbarTitle.textContent = site.name;
  topbarPage.textContent = currentTab === "pages" ? "Pages" : "design.md";

  // Topbar actions
  topbarActions.innerHTML = `
    <button class="btn btn-secondary btn-icon" title="Refresh" onclick="refreshSite()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
    </button>
  `;

  // Content
  siteContent.innerHTML = "";

  // Site header
  const header = document.createElement("div");
  header.className = "site-header";
  header.innerHTML = `
    <div class="site-header-icon">${site.name[0].toUpperCase()}</div>
    <div class="site-header-info">
      <h2>${site.name}</h2>
      <div class="meta">${site.pages.length} page${site.pages.length !== 1 ? "s" : ""} captured${site.hasDesignMd ? " &middot; design.md available" : ""}</div>
    </div>
  `;
  siteContent.appendChild(header);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "tabs";
  tabs.innerHTML = `
    <button class="tab ${currentTab === "pages" ? "active" : ""}" onclick="switchTab('pages')">Pages</button>
    <button class="tab ${currentTab === "design-md" ? "active" : ""}" onclick="switchTab('design-md')">design.md</button>
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
  tabs.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.textContent.trim() === (tab === "pages" ? "Pages" : "design.md"));
  });

  if (tab === "pages") {
    renderPagesTab(currentSite);
  } else {
    renderDesignMdTab(currentSite);
  }
}

// ─── Pages tab ──────────────────────────────────

function renderPagesTab(site) {
  const grid = document.createElement("div");
  grid.className = "pages-grid";

  for (const page of site.pages) {
    const card = document.createElement("div");
    card.className = "page-card";

    const previewUrl = `${API}/api/sites/${site.name}/preview/${page.rendered}`;
    const slug = page.rendered.replace("rendered-", "").replace(".html", "");

    card.innerHTML = `
      <div class="page-card-preview">
        <iframe src="${previewUrl}" loading="lazy" sandbox="allow-same-origin"></iframe>
      </div>
      <div class="page-card-info">
        <span class="page-card-name">${slug}</span>
        <span class="page-card-size">${page.captureKB || "?"}KB</span>
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

  // Update tab active (none active for preview)
  tabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));

  const panel = document.createElement("div");
  panel.className = "page-preview-panel show";

  const toolbar = document.createElement("div");
  toolbar.className = "design-md-toolbar";
  toolbar.innerHTML = `
    <button class="btn btn-secondary" onclick="switchTab('pages')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>
    <span style="flex:1"></span>
    <button class="btn btn-secondary" onclick="window.open('${API}/api/sites/${siteName}/preview/${page.rendered}', '_blank')">
      Open in new tab
    </button>
    <button class="btn btn-secondary" style="color: var(--red-error);" onclick="confirmDeletePage('${siteName}', '${page.capture}')">
      Delete
    </button>
  `;
  panel.appendChild(toolbar);

  const frame = document.createElement("div");
  frame.className = "page-preview-frame";
  frame.innerHTML = `<iframe src="${API}/api/sites/${siteName}/preview/${page.rendered}"></iframe>`;
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
  container.className = "design-md-panel show";

  const toolbar = document.createElement("div");
  toolbar.className = "design-md-toolbar";
  toolbar.innerHTML = `<span class="status-text">Loading...</span>`;
  container.appendChild(toolbar);

  const content = document.createElement("div");
  content.className = "design-md-content md-rendered";
  content.textContent = "Loading...";
  container.appendChild(content);

  siteContent.appendChild(container);

  const md = await loadDesignMd(site.name);

  if (md) {
    toolbar.innerHTML = `
      <button class="btn btn-primary" onclick="copyDesignMd('${site.name}')">Copy to clipboard</button>
      <button class="btn btn-secondary" onclick="downloadDesignMd('${site.name}')">Download</button>
      <button class="btn btn-accent" onclick="regenerateDesignMd('${site.name}')">Regenerate</button>
      <span class="status-text">${(md.length / 1024).toFixed(1)}KB</span>
    `;
    content.innerHTML = renderMarkdown(md);
  } else {
    toolbar.innerHTML = `
      <button class="btn btn-primary" onclick="regenerateDesignMd('${site.name}')">Generate design.md</button>
      <span class="status-text">No design.md found</span>
    `;
    content.innerHTML = `
      <div class="design-md-empty">
        <p>No <code>design.md</code> exists for this site yet.</p>
        <p>Click <strong>Generate</strong> to auto-extract design tokens from the captured pages,<br>or create one manually and place it at <code>.data/${site.name}/design.md</code></p>
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
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = "toast"; }, 3000);
}
