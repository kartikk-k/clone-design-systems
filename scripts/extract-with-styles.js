/**
 * extract-with-styles.js
 * ----------------------
 * Open the page (or power.js-captured HTML) in Chrome.
 * Paste this in DevTools Console, then:
 *
 *   extract(document.querySelector('.automations-template-card'))
 *
 * Uses the browser's own CSS engine (matches/querySelectorAll) to find
 * which rules apply — inspired by github.com/painty/CSS-Used-ChromeExt
 */

(function () {
  // Pseudo-classes/elements to strip for matching
  const PSEUDO_CLASS = 'active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited|focus-within|focus-visible|fullscreen';
  const PSEUDO_ELEMENT = '((-(webkit|moz)-)?(scrollbar(-(button|thumb|corner|track(-piece)?))?))|-webkit-(details-marker|resizer)|after|before|first-letter|first-line|placeholder|selection';
  const RE_PSEUDO_ONLY = new RegExp('^(:(' + PSEUDO_CLASS + ')|::?(' + PSEUDO_ELEMENT + '))+$', '');
  const RE_PSEUDO_SPACE = new RegExp('( |^)(:(' + PSEUDO_CLASS + ')|::?(' + PSEUDO_ELEMENT + '))+( |$)', 'ig');
  const RE_PSEUDO_PAREN = new RegExp('\\((:(' + PSEUDO_CLASS + ')|::?(' + PSEUDO_ELEMENT + '))+\\)', 'ig');
  const RE_PSEUDO_TAIL = new RegExp('(:(' + PSEUDO_CLASS + ')|::?(' + PSEUDO_ELEMENT + '))+', 'ig');

  function stripPseudo(sel) {
    return sel
      .replace(RE_PSEUDO_SPACE, ' * ')
      .replace(RE_PSEUDO_PAREN, '(*)')
      .replace(RE_PSEUDO_TAIL, '')
      .replace(/:not\(\*\)/ig, '');
  }

  /**
   * Check if a CSS selector matches the element or any of its descendants.
   */
  function selectorApplies(el, selector) {
    // Pure pseudo selector (e.g. ":hover") — always include
    if (selector.length < 40 && RE_PSEUDO_ONLY.test(selector)) return true;

    const cleaned = stripPseudo(selector);
    if (!cleaned.trim()) return false;

    try {
      if (el.matches(cleaned)) return true;
      if (el.querySelectorAll(cleaned).length > 0) return true;
    } catch (e) {
      // Invalid selector — skip
    }
    return false;
  }

  /**
   * Walk all stylesheets and collect CSS rules that apply to el or its children.
   */
  function getUsedCSS(el) {
    const used = [];
    const keyframesUsed = new Set();
    const fontsUsed = new Set();

    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; } catch (e) { continue; }

      for (const rule of rules) {
        // Regular style rule
        if (rule instanceof CSSStyleRule) {
          const selText = rule.selectorText;

          // Always include :root, html, body, * rules (CSS variables, global styles)
          if (/^(\*|:root|html|body)([,\s:{[.]|$)/.test(selText.trim()) ||
              selText.includes(':root') ||
              (selText.trim() === '*') ||
              (selText.includes('.dark') && selText.includes('html'))) {
            used.push(rule.cssText);
            // Track fonts
            const ff = rule.style.fontFamily;
            if (ff) ff.split(',').forEach(f => fontsUsed.add(f.trim().replace(/^['"]|['"]$/g, '')));
            continue;
          }

          // Split comma-separated selectors, check each
          const selectors = selText.split(',');
          const matching = selectors.filter(s => selectorApplies(el, s.trim()));
          if (matching.length > 0) {
            used.push(matching.join(',') + '{' + rule.style.cssText + '}');

            // Track animation names
            const anim = rule.style.animationName || rule.style.webkitAnimationName;
            if (anim && anim !== 'none') anim.split(',').forEach(a => keyframesUsed.add(a.trim()));

            // Track font families
            const ff = rule.style.fontFamily;
            if (ff) ff.split(',').forEach(f => fontsUsed.add(f.trim().replace(/^['"]|['"]$/g, '')));
          }
        }
        // @media rules — check inner rules
        else if (rule instanceof CSSMediaRule) {
          const innerUsed = [];
          for (const inner of rule.cssRules) {
            if (inner instanceof CSSStyleRule) {
              const selText = inner.selectorText;
              // Always keep :root/html/body/* rules inside @media
              if (/^(\*|:root|html|body)([,\s:{[.]|$)/.test(selText.trim()) ||
                  selText.includes(':root') || selText.trim() === '*') {
                innerUsed.push(inner.cssText);
                continue;
              }
              const selectors = selText.split(',');
              const matching = selectors.filter(s => selectorApplies(el, s.trim()));
              if (matching.length > 0) {
                innerUsed.push(matching.join(',') + '{' + inner.style.cssText + '}');
              }
            }
          }
          if (innerUsed.length > 0) {
            used.push('@media ' + rule.conditionText + '{' + innerUsed.join('') + '}');
          }
        }
        // @keyframes
        else if (rule instanceof CSSKeyframesRule) {
          if (keyframesUsed.has(rule.name)) {
            used.push(rule.cssText);
          }
        }
        // @font-face
        else if (rule instanceof CSSFontFaceRule) {
          const family = rule.style.getPropertyValue('font-family').replace(/^['"]|['"]$/g, '');
          if (fontsUsed.has(family)) {
            used.push(rule.cssText);
          }
        }
        // @supports, @layer — include if they reference matching selectors
        else if (rule instanceof CSSSupportsRule || (rule.constructor && rule.constructor.name === 'CSSLayerBlockRule')) {
          try {
            const innerUsed = [];
            for (const inner of rule.cssRules) {
              if (inner instanceof CSSStyleRule) {
                const selectors = inner.selectorText.split(',');
                const matching = selectors.filter(s => selectorApplies(el, s.trim()));
                if (matching.length > 0) {
                  innerUsed.push(matching.join(',') + '{' + inner.style.cssText + '}');
                }
              }
            }
            if (innerUsed.length > 0) {
              used.push(rule.cssText);
            }
          } catch (e) {}
        }
      }
    }

    // Second pass: include @font-face and @keyframes that were referenced
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; } catch (e) { continue; }
      for (const rule of rules) {
        if (rule instanceof CSSKeyframesRule && keyframesUsed.has(rule.name)) {
          if (!used.some(u => u.includes('@keyframes ' + rule.name))) {
            used.push(rule.cssText);
          }
        }
        if (rule instanceof CSSFontFaceRule) {
          const family = rule.style.getPropertyValue('font-family').replace(/^['"]|['"]$/g, '');
          if (fontsUsed.has(family) && !used.some(u => u.includes(family) && u.startsWith('@font-face'))) {
            used.push(rule.cssText);
          }
        }
      }
    }

    return used.join('\n');
  }

  window.extract = function (el) {
    if (!el || el.nodeType !== 1) {
      console.log('Usage: extract(document.querySelector(".your-class"))');
      return;
    }

    console.log('Extracting:', el.tagName, el.className.toString().substring(0, 50));
    console.time('extract');

    const css = getUsedCSS(el);

    console.timeEnd('extract');
    console.log('CSS rules size:', (css.length / 1024).toFixed(1) + 'KB');

    // Get body styles for context
    const bodyCS = getComputedStyle(document.body);
    const bg = bodyCS.backgroundColor;
    const color = bodyCS.color;
    const font = bodyCS.fontFamily;

    // Get the component HTML (original, with classes intact)
    const componentHTML = el.outerHTML;

    const output = `<!DOCTYPE html>
<html${document.documentElement.getAttribute('class') ? ' class="' + document.documentElement.getAttribute('class') + '"' : ''}${document.documentElement.getAttribute('style') ? ' style="' + document.documentElement.getAttribute('style') + '"' : ''}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Component</title>
<style>
/* Reset */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${bg};color:${color};font-family:${font};-webkit-font-smoothing:antialiased}
button{background:none;border:none;color:inherit;font:inherit;cursor:pointer}

/* Component CSS (extracted) */
${css}
</style>
</head>
<body${document.body.getAttribute('class') ? ' class="' + document.body.getAttribute('class') + '"' : ''}>
<div style="padding:24px;max-width:600px">
${componentHTML}
</div>
</body>
</html>`;

    // Download
    const blob = new Blob([output], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log('%c✓ Downloaded component.html', 'color:green;font-weight:bold');
    console.log('Total size:', (output.length / 1024).toFixed(1) + 'KB');

    return output;
  };

  console.log('%c✓ extract() ready', 'color:green;font-weight:bold');
  console.log('Run: extract(document.querySelector(".your-component-class"))');
})();
