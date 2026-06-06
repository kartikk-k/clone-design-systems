/** HTML page template with resets and font fallbacks */

import { esc } from "./renderer.ts";

export function buildPage(opts: {
  title: string;
  primaryFont: string;
  bgColor: string;
  textColor: string;
  pageWidth: number;
  pageHeight: number;
  contentHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${opts.primaryFont};
      color: ${opts.textColor};
      background-color: ${opts.bgColor};
      -webkit-font-smoothing: antialiased;
    }

    .page {
      position: relative;
      width: ${opts.pageWidth}px;
      height: ${opts.pageHeight}px;
      margin: 0 auto;
      overflow: hidden;
    }

    /* Element resets */
    img { display: block; }
    a { color: inherit; text-decoration: inherit; }
    button { background: none; border: none; color: inherit; font: inherit; padding: 0; cursor: pointer; appearance: none; }
    input, select, textarea { background: none; border: none; color: inherit; font: inherit; appearance: none; }

    /* Font fallback mappings for common proprietary fonts */
    @font-face { font-family: 'Roobert'; src: local('Inter'), local('DM Sans'); font-weight: 100 900; }
    @font-face { font-family: 'Roobert Fallback'; src: local('Inter'), local('DM Sans'); font-weight: 100 900; }
    @font-face { font-family: 'PPNeueMontreal'; src: local('Inter'), local('Outfit'); font-weight: 100 900; }
    @font-face { font-family: 'PPNeueMontreal Fallback'; src: local('Inter'), local('Outfit'); font-weight: 100 900; }
    @font-face { font-family: 'PPNeueMontrealMono'; src: local('SF Mono'), local('Fira Code'), local('monospace'); font-weight: 100 900; }
    @font-face { font-family: 'PPNeueMontrealMono Fallback'; src: local('SF Mono'), local('Fira Code'); font-weight: 100 900; }
    @font-face { font-family: 'sohne-var'; src: local('Inter'), local('Helvetica Neue'); font-weight: 100 900; }
    @font-face { font-family: 'OpenAI Sans'; src: local('Inter'), local('Helvetica Neue'); font-weight: 100 900; }
    @font-face { font-family: 'Geist'; src: local('Inter'), local('system-ui'); font-weight: 100 900; }
    @font-face { font-family: 'Geist Mono'; src: local('SF Mono'), local('Fira Code'); font-weight: 100 900; }
  </style>
</head>
<body>
  <div class="page">
${opts.contentHtml}
  </div>
</body>
</html>`;
}
