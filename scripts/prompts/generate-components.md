# Generate Design System Components

You are a design engineer. Follow the process below EXACTLY. Do NOT think, plan, or strategize. Execute each step in order. Do NOT use extended thinking mode.

---

## STEP 1: Extract ALL page outlines + CSS (SINGLE SCRIPT — ONE Bash call)

Run this ONE Python script that processes ALL files at once. Do NOT run separate calls per file.

```bash
python3 << 'PYEOF'
import re, json, hashlib, os, glob

site_dir = "SITE_DIR_PATH"
files = sorted(glob.glob(os.path.join(site_dir, "optimized-*.html")))

results = {"pages": [], "css_vars": {}, "html_vars": ""}

# Deduplicate CSS vars across all files
all_css_vars = {}

for fpath in files:
    html = open(fpath).read()
    fname = os.path.basename(fpath)

    # Extract HTML tag style (theme vars) — same across pages, grab once
    if not results["html_vars"]:
        hm = re.search(r'<html[^>]*style="([^"]*)"', html)
        if hm:
            results["html_vars"] = hm.group(1)

    # Extract CSS vars from this page
    styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL)
    for s in styles:
        for name, val in re.findall(r'(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+)', s):
            key = name.strip()
            v = val.strip()
            if key not in all_css_vars or len(v) > len(all_css_vars[key]):
                all_css_vars[key] = v

    # Extract body outline (no CSS, no scripts, no SVG paths, trimmed styles)
    body = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    body_html = body.group(1) if body else ''
    body_html = re.sub(r'<style[^>]*>.*?</style>', '', body_html, flags=re.DOTALL)
    body_html = re.sub(r'<script[^>]*>.*?</script>', '', body_html, flags=re.DOTALL)
    # Keep SVG paths intact — do NOT strip d="" attributes
    body_html = re.sub(r'data:image/[^"]*', '', body_html)
    def trim_style(m):
        s = m.group(1)
        return f' style="{s[:80]}"' if len(s) > 80 else m.group(0)
    body_html = re.sub(r'\sstyle="([^"]*)"', trim_style, body_html)
    body_html = re.sub(r'\s+', ' ', body_html)

    texts = [t.strip() for t in re.findall(r'>([^<]{2,})<', body_html) if t.strip() and not t.strip().startswith('{')]

    results["pages"].append({
        "file": fname,
        "texts": texts[:40],
        "text_count": len(texts),
        "html_size": len(body_html),
    })

# Categorize CSS vars
results["css_vars"] = {
    "colors": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['color', 'bg', 'border', 'text', 'shadow', 'accent', 'brand', 'fill', 'stroke', 'foreground', 'background'])},
    "spacing": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['spacing', 'gap', 'padding', 'margin', 'radius', 'size', 'height', 'width'])},
    "fonts": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['font', 'line-height', 'letter', 'weight'])},
}

print(json.dumps(results, indent=2))
PYEOF
```

Replace `SITE_DIR_PATH` with the actual site directory path.

## STEP 2: Review outlines and identify unique components

From the Step 1 outlines, build this inventory. Do NOT read any HTML files again. Just use the outlines.

For each page, list:
- **Shared**: components that appear on 3+ pages (sidebar, header, nav)
- **Unique**: components only on this page

Write the inventory as a simple list — no code, no HTML. Just names.

## STEP 3: Generate components.html (START IMMEDIATELY)

NOW generate the components.html file. You have:
- The page outlines + CSS variables (Step 1)
- The component inventory (Step 2)

For each component in the inventory, read the SPECIFIC section from the relevant HTML file to get exact styles AND SVG icons. Use targeted reads — do NOT read entire files.

IMPORTANT: Do NOT strip SVG path data (`d="..."`) in targeted reads. The SVG icons must be preserved exactly as they appear in the source.

```bash
# Example: extract a specific component section with full SVG icons intact
python3 -c "
import re, sys
html = open(sys.argv[1]).read()
body = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL).group(1)
# Strip only scripts and style blocks (keep SVGs fully intact)
body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL)
body = re.sub(r'<style[^>]*>.*?</style>', '', body, flags=re.DOTALL)
# Find specific section by searching for known text
idx = body.find('SEARCH_TEXT')
if idx > -1:
    start = max(0, idx - 1500)
    end = min(len(body), idx + 4000)
    print(body[start:end])
" FILE_PATH
```

Run MULTIPLE targeted reads in PARALLEL when extracting different components from different files.

### Output format

```html
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    @theme {
      /* ALL color tokens extracted from Step 2 */
    }
  </style>
</head>
<body class="bg-[PAGE_BG] text-[TEXT_PRIMARY] font-[FONT_FAMILY] p-6">

  <!-- PAGE LAYOUTS (MANDATORY — include before components) -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Page Layouts</div>
    <!--
      For EACH unique page layout found across all captures, show:
      1. A visual wireframe using Tailwind (boxes with labels, correct proportions)
      2. The exact widths, heights, gaps used

      Common layouts to extract:
      - Sidebar + Main content (sidebar width, main flex-1)
      - Full-width page (max-width, padding)
      - Settings: sidebar nav + content panel
      - Detail view: content + right sidebar/properties panel
      - Modal/dialog overlay layout
      - Mobile layout (if captured)

      Use actual dimensions from the source:
      - Sidebar width (e.g. 260px, 280px)
      - Header height
      - Content max-width
      - Panel gaps/padding
      - Border between panels
    -->
  </div>

  <!-- COLOR PALETTE -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Color Palette</div>
    <div class="mb-4">
      <div class="text-[11px] text-white/20 mb-2">Backgrounds</div>
      <div class="flex gap-3 flex-wrap">
        <!-- swatch for each bg color -->
        <div class="text-center">
          <div class="w-14 h-14 rounded-lg" style="background: EXACT_VALUE"></div>
          <span class="text-[10px] text-white/30 mt-1 block">name</span>
          <span class="text-[9px] text-white/20 block font-mono">value</span>
        </div>
      </div>
    </div>
    <!-- Repeat for: Text, Borders, Accents, Status -->
  </div>

  <!-- TYPOGRAPHY -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Typography</div>
    <!-- Each text level as a rendered sample -->
  </div>

  <!-- Then EACH component section -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Component Name</div>
    <!-- Component using Tailwind classes -->
  </div>

</body>
</html>
```

## RULES

- NEVER fabricate content — every word must come from the source HTML
- NEVER use generic Tailwind colors (blue-500, gray-200) — use exact values
- NEVER center component sections — full width, left aligned
- NEVER add wrapper borders around sections
- NEVER strip, modify, or approximate SVG icons — copy the EXACT `<svg>` element including all `<path d="...">` data from the source HTML
- NEVER generate or guess SVG paths — if you cannot find the exact SVG, leave a placeholder comment `<!-- icon: NAME -->` instead of fabricating one
- Include PAGE LAYOUTS first, then COLOR PALETTE + TYPOGRAPHY, then components
- Use exact font sizes as arbitrary values: `text-[13px]` not `text-sm`
- Preserve `lch()`, `oklch()`, `color-mix()` color functions as-is
- Each component should appear ONCE — use the best example from any page

## COMPONENTS CHECKLIST

Extract these if they exist (check the outlines from Step 1):

- [ ] **PAGE LAYOUTS** (MANDATORY — every unique layout as a wireframe with exact dimensions)
- [ ] Sidebar navigation (active + inactive items)
- [ ] Top header / toolbar
- [ ] Page title / section headers
- [ ] Chat input / text area
- [ ] Chat messages (user + assistant)
- [ ] Code blocks
- [ ] File tree / file list
- [ ] Task/activity list items
- [ ] Cards (plugin cards, project cards, etc.)
- [ ] Buttons (every variant: primary, secondary, ghost, icon)
- [ ] Tabs / filters
- [ ] Toggle switches
- [ ] Select dropdowns
- [ ] Settings rows (label + control)
- [ ] Status badges / tags
- [ ] Empty states
- [ ] Avatar / user info
- [ ] Links / navigation items
- [ ] Dividers / separators
- [ ] Modals / dialogs (if captured)
- [ ] Tooltips (if captured)
- [ ] Terminal / console output
- [ ] Diff view / code changes
- [ ] Progress indicators
- [ ] Breadcrumbs
