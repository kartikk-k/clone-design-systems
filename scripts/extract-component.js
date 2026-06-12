/**
 * extract-component.js
 * --------------------
 * Paste this in DevTools Console on the target page.
 *
 * Usage:
 *   1. Right-click the component you want → Inspect
 *   2. In Console, run: extractComponent($0)
 *   3. It copies a self-contained HTML to clipboard
 *
 * How it works:
 *   - Walks the DOM tree bottom-up
 *   - Gets getComputedStyle() for every element
 *   - Inlines only the styles that differ from defaults
 *   - Produces minimal HTML with zero external CSS needed
 */

(function() {
  // Default styles for each tag — we skip these to keep output small
  const DEFAULT_IFRAME = document.createElement('iframe');
  DEFAULT_IFRAME.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden';
  document.body.appendChild(DEFAULT_IFRAME);
  const defaultDoc = DEFAULT_IFRAME.contentDocument;
  const defaultStyles = {};

  function getDefaultStyles(tagName) {
    if (defaultStyles[tagName]) return defaultStyles[tagName];
    const el = defaultDoc.createElement(tagName);
    defaultDoc.body.appendChild(el);
    const styles = DEFAULT_IFRAME.contentWindow.getComputedStyle(el);
    const map = {};
    for (let i = 0; i < styles.length; i++) {
      const prop = styles[i];
      map[prop] = styles.getPropertyValue(prop);
    }
    defaultDoc.body.removeChild(el);
    defaultStyles[tagName] = map;
    return map;
  }

  // Properties we care about for design extraction
  const DESIGN_PROPS = [
    // Box model
    'display', 'position', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'box-sizing',
    // Flex/Grid
    'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'align-items', 'align-self', 'justify-content', 'gap', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows',
    // Typography
    'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'text-decoration', 'text-decoration-line', 'text-decoration-color',
    'color', 'white-space', 'word-break', 'text-overflow', 'overflow-wrap',
    // Background
    'background-color', 'background-image', 'background-size', 'background-position',
    'background-repeat', 'background-clip',
    // Borders
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
    // Effects
    'box-shadow', 'opacity', 'backdrop-filter', 'filter',
    'overflow', 'overflow-x', 'overflow-y',
    // Stacking
    'z-index', 'isolation',
    // Cursor
    'cursor',
    // Transitions (skip for static extraction)
    // 'transition',
  ];

  // Values to skip (defaults that add no visual effect)
  function isDefaultValue(prop, value) {
    if (value === 'none' && ['background-image', 'box-shadow', 'filter', 'backdrop-filter', 'text-decoration', 'text-decoration-line'].includes(prop)) return true;
    if (value === 'visible' && ['overflow', 'overflow-x', 'overflow-y'].includes(prop)) return true;
    if (value === '0px' && prop.startsWith('margin')) return true;
    if (value === '0px' && prop.startsWith('border') && prop.endsWith('width')) return true;
    if (value === '0px' && prop.includes('radius')) return true;
    if (value === 'auto' && ['z-index', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'flex-basis'].includes(prop)) return true;
    if (value === '1' && prop === 'opacity') return true;
    if (value === 'normal' && ['letter-spacing', 'white-space', 'word-break'].includes(prop)) return true;
    if (value === 'start' && prop === 'text-align') return true;
    if (value === 'auto' && prop === 'cursor') return true;
    if (value === 'content-box' && prop === 'box-sizing') return true;
    if (value === 'rgba(0, 0, 0, 0)' && prop === 'background-color') return true;
    if (value === '0' && ['flex-grow', 'flex-shrink'].includes(prop)) return true;
    if (value === 'row' && prop === 'flex-direction') return true;
    if (value === 'nowrap' && prop === 'flex-wrap') return true;
    if (value === 'stretch' && ['align-items', 'align-self'].includes(prop)) return true;
    if (value === 'normal' && ['gap', 'row-gap', 'column-gap', 'justify-content'].includes(prop)) return true;
    return false;
  }

  function extractStyles(el) {
    const computed = window.getComputedStyle(el);
    const tagDefaults = getDefaultStyles(el.tagName.toLowerCase());
    const styles = [];

    for (const prop of DESIGN_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;
      if (isDefaultValue(prop, value)) continue;
      // Skip if same as browser default for this tag
      if (tagDefaults[prop] === value) continue;
      styles.push(`${prop}: ${value}`);
    }

    return styles.join('; ');
  }

  function extractElement(el, depth = 0) {
    if (depth > 30) return '';

    // Text node
    if (el.nodeType === 3) {
      const text = el.textContent.trim();
      return text ? escapeHtml(text) : '';
    }

    if (el.nodeType !== 1) return '';

    const tag = el.tagName.toLowerCase();

    // Skip scripts, styles, etc
    if (['script', 'style', 'noscript', 'iframe'].includes(tag)) return '';

    const styles = extractStyles(el);

    // Handle SVG
    if (tag === 'svg') {
      const svgHtml = el.outerHTML;
      // Wrap SVG with its computed dimensions
      return svgHtml;
    }

    // Handle images
    if (tag === 'img') {
      const src = el.currentSrc || el.src || '';
      const alt = el.alt || '';
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="${styles}" />`;
    }

    // Build children
    let children = '';
    for (const child of el.childNodes) {
      children += extractElement(child, depth + 1);
    }

    // Self-closing void elements
    if (['br', 'hr', 'input'].includes(tag)) {
      return `<${tag} style="${styles}" />`;
    }

    return `<${tag} style="${styles}">${children}</${tag}>`;
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Main function — call with a DOM element
  window.extractComponent = function(el) {
    if (!el) {
      console.log('Usage: extractComponent($0)  — first inspect the element, then run this');
      return;
    }

    console.log('Extracting component:', el.tagName, el.className);

    const componentHtml = extractElement(el);

    // Get page background
    const bodyStyles = window.getComputedStyle(document.body);
    const pageBg = bodyStyles.backgroundColor;
    const pageColor = bodyStyles.color;
    const pageFont = bodyStyles.fontFamily;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${pageBg}; color: ${pageColor}; font-family: ${pageFont}; -webkit-font-smoothing: antialiased; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: inherit; }
    button { background: none; border: none; color: inherit; font: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <div style="padding: 24px; max-width: 600px;">
    ${componentHtml}
  </div>
</body>
</html>`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullHtml).then(() => {
      console.log('%c✓ Component HTML copied to clipboard!', 'color: green; font-weight: bold');
      console.log('Size:', (fullHtml.length / 1024).toFixed(1) + 'KB');
      console.log('Paste into an .html file and open in browser to verify.');
    });

    // Also offer download
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log('%c✓ Component downloaded as component.html', 'color: green');

    // Cleanup
    DEFAULT_IFRAME.remove();

    return fullHtml;
  };

  console.log('%c✓ extractComponent() ready', 'color: green; font-weight: bold');
  console.log('Usage: Right-click element → Inspect → in Console run: extractComponent($0)');
})();
