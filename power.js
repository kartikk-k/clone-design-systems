/*
 * inline-page.js
 * --------------
 * Paste this whole thing into your browser's DevTools Console (F12 → Console)
 * while you're on the page you want to save, then press Enter.
 * It downloads a single self-contained .html file with the CSS, JS, and
 * images inlined.
 *
 * It captures the CURRENT state of the DOM, so for React/Vue/etc. apps you get
 * the page as it looks right now (after JS has rendered it).
 */
(async function inlinePage() {
    const baseURI = document.baseURI;
  
    // --- helpers --------------------------------------------------------------
  
    // Fetch a text resource (CSS / JS). Returns null on failure (e.g. CORS).
    async function fetchText(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.text();
      } catch (e) {
        console.warn('Skipped (could not fetch, likely CORS):', url, '—', e.message);
        return null;
      }
    }
  
    // Fetch a binary resource and return it as a data: URI. Null on failure.
    async function fetchDataURI(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Skipped image (could not fetch, likely CORS):', url, '—', e.message);
        return null;
      }
    }
  
    // Rewrite url(...) references inside a CSS string to absolute URLs,
    // resolved against the stylesheet's own location.
    function absolutizeCssUrls(css, cssHref) {
      return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
        if (/^(data:|https?:|#)/i.test(ref)) return m;
        try {
          return 'url("' + new URL(ref, cssHref).href + '")';
        } catch {
          return m;
        }
      });
    }
  
    // --- work on a CLONE so we never mutate the live page ---------------------
    const doc = document.documentElement.cloneNode(true);
  
    // <base> tags would mess up our absolute-URL strategy: drop them.
    doc.querySelectorAll('base').forEach(b => b.remove());
  
    // 1. Inline external stylesheets ------------------------------------------
    for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]) {
      const href = new URL(link.getAttribute('href'), baseURI).href;
      const css = await fetchText(href);
      if (css !== null) {
        const style = document.createElement('style');
        style.textContent = absolutizeCssUrls(css, href);
        link.replaceWith(style);
      }
    }
  
    // 2. Inline external scripts ----------------------------------------------
    //    (Inline scripts already in the page are kept as-is.)
    for (const script of [...doc.querySelectorAll('script[src]')]) {
      const src = new URL(script.getAttribute('src'), baseURI).href;
      const js = await fetchText(src);
      if (js !== null) {
        const inline = document.createElement('script');
        if (script.type) inline.type = script.type;
        // CRITICAL: a raw "</script" inside the JS (e.g. React's "<script></script>"
        // feature-check string) would prematurely close this inline tag and dump the
        // rest of the bundle onscreen as text. Escaping the slash keeps the JS
        // identical but hides it from the HTML parser.
        inline.textContent = js.replace(/<\/(script)/gi, '<\\/$1');
        script.replaceWith(inline);
      }
    }
  
    // 3. Inline images as data URIs -------------------------------------------
    for (const img of [...doc.querySelectorAll('img[src]')]) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) continue;
      const abs = new URL(src, baseURI).href;
      const dataURI = await fetchDataURI(abs);
      if (dataURI) img.setAttribute('src', dataURI);
    }
    // srcset would re-introduce broken relative refs; strip it.
    doc.querySelectorAll('img[srcset], source[srcset]')
       .forEach(el => el.removeAttribute('srcset'));
  
    // 4. Make remaining links/anchors absolute so navigation still resolves ----
    for (const el of [...doc.querySelectorAll('a[href]')]) {
      const href = el.getAttribute('href');
      if (href && !/^(data:|https?:|mailto:|tel:|#|javascript:)/i.test(href)) {
        try { el.setAttribute('href', new URL(href, baseURI).href); } catch {}
      }
    }
  
    // --- assemble and download ------------------------------------------------
    const html = '<!DOCTYPE html>\n' + doc.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ((document.title || 'page').replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'page') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  
    console.log('%c✓ Single-file HTML downloaded.', 'color:green;font-weight:bold');
  })();