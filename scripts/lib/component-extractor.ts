/**
 * Extract key UI components from rendered HTML.
 * Instead of re-rendering from figh2d, we extract sections directly from the
 * already-rendered pixel-perfect HTML.
 */

export function extractComponents(renderedHtmlPaths: string[], renderedHtmlContents: string[], siteName: string): string {
  const sections: string[] = [];

  for (let i = 0; i < renderedHtmlContents.length; i++) {
    const html = renderedHtmlContents[i]!;
    const filename = renderedHtmlPaths[i] || `page-${i + 1}`;

    // Extract the page container content (between <div class="page"> and its closing)
    const pageStart = html.indexOf('<div class="page">');
    const pageEnd = html.lastIndexOf("</div>\n</body>");
    if (pageStart === -1 || pageEnd === -1) continue;

    const pageContent = html.slice(pageStart, pageEnd + 6);

    // Extract the <style> block for the full page styles
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch?.[1] || "";

    sections.push(`
<!-- ════════════════════════════════════════════════════════ -->
<!-- Page: ${filename} -->
<!-- ════════════════════════════════════════════════════════ -->
${pageContent}
`);
  }

  // Get body styles from the first rendered HTML
  const firstHtml = renderedHtmlContents[0] || "";
  const bodyBg = firstHtml.match(/background-color:\s*([^;}"]+)/)?.[1]?.trim() || "rgb(255,255,255)";
  const bodyColor = firstHtml.match(/(?:body\s*\{[^}]*?)color:\s*([^;}"]+)/)?.[1]?.trim() || "rgb(0,0,0)";
  const bodyFont = firstHtml.match(/font-family:\s*([^;}"]+)/)?.[1]?.trim() || "system-ui, sans-serif";

  // Extract the <style> block
  const styleMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/);
  const pageStyles = styleMatch?.[1] || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Extracted Components — ${siteName}</title>
  <style>
${pageStyles}

    /* Component showcase overrides */
    .page-label {
      font-family: system-ui, sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: rgba(128, 128, 128, 0.6);
      padding: 20px 0 10px 0;
    }
  </style>
</head>
<body>
  <div style="padding: 20px; font-family: system-ui; font-size: 13px; color: rgba(128,128,128,0.5);">
    Extracted Components — ${siteName} — ${renderedHtmlPaths.length} page(s)
  </div>
${sections.join("\n")}
</body>
</html>`;
}
