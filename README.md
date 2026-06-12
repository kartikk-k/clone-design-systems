# Design Grab

Grab any website's design system. Capture pages, extract components, and generate a portable Tailwind CSS component library — ready for AI agents to use.

<p>
  <a href="https://www.npmjs.com/package/designgrab"><img src="https://img.shields.io/npm/v/designgrab" alt="npm version"></a>
  <a href="https://github.com/kartikk-k/designgrab/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/designgrab" alt="license"></a>
  <a href="https://www.npmjs.com/package/designgrab"><img src="https://img.shields.io/npm/dm/designgrab" alt="downloads"></a>
</p>

## How It Works

1. **Capture** — Use the Chrome extension to capture pages from any website. The extension extracts clean HTML with all CSS inlined and scripts stripped.

2. **Extract** — The dashboard provides an AI prompt that analyzes captured pages and extracts every unique UI component into a `components.html` file using Tailwind CSS.

3. **Use** — Run `designgrab add <sitename>` in your project. AI agents reference `.designgrab/DESIGN.md` to build pixel-perfect UIs using the extracted components.

## Quick Start

```bash
# Start the server + dashboard
npx designgrab

# Or with bun
bunx designgrab
```

This opens the dashboard at `http://localhost:3847`. Install the Chrome extension (see below), capture some pages, then generate components.

## Install the Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the `extension/` directory from this package
4. Navigate to any website, click the extension icon, and capture

## CLI Reference

```
Usage:  designgrab [command] [options]

Commands:
  start                  Start the dashboard server (default)
  stop                   Stop the running server
  list                   List captured sites (alias: ls)
  add <name>             Install design system from local captures
  add --public <name>    Install from public registry

Options:
  --port <number>        Server port (default: 3847)
  --no-open              Don't open browser on start
  --help, -h             Show help
  --version, -v          Show version
  --agent                Show full documentation for AI agents

List options:
  --local                Show local captures (default)
  --public               Show designs from public registry
```

### Start the Server

```bash
# Default (port 3847, opens browser)
designgrab

# Custom port, no auto-open
designgrab start --port 4000 --no-open

# Stop a running server
designgrab stop
```

### List Sites

```bash
# List locally captured sites
designgrab list

# List designs from the public registry
designgrab list --public
```

### Add to Project

```bash
# Install from local captures
designgrab add stripe

# Install from public registry
designgrab add --public stripe
```

This creates a `.designgrab/` directory in your project with:

| File | Description |
|------|-------------|
| `components.html` | Every UI component in Tailwind CSS |
| `design-system.html` | Color palette, typography, spacing reference |
| `instructions.md` | Rules for AI agents |
| `DESIGN.md` | Entry point — reference this in your AI agent |

## Using with AI Agents

After running `designgrab add <name>`, tell your AI agent to read `.designgrab/DESIGN.md`. The agent will:

1. Use exact Tailwind classes from `components.html`
2. Follow color, typography, and spacing tokens from the design system
3. Never use generic Tailwind defaults — only extracted values
4. Reproduce the original design exactly

```
# Example: Add to CLAUDE.md or system prompt
Read .designgrab/DESIGN.md for the design system reference.
Use ONLY the components and tokens from the .designgrab/ files.
```

Run `designgrab --agent` for complete documentation including API endpoints and architecture details.

## Data Directory

All captures are stored in `~/.designgrab/`:

```
~/.designgrab/
  stripe/
    capture-home.html           # Captured page
    capture-pricing.html        # Another captured page
    components.html             # Extracted components (AI-generated)
    design-system.html          # Visual design reference
    instructions.md             # Agent rules
```

## API Endpoints

The local server exposes these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard |
| GET | `/health` | Health check |
| POST | `/capture` | Receive capture from extension |
| GET | `/api/sites` | List all sites |
| GET | `/api/sites/:name` | Site detail |
| DELETE | `/api/sites/:name` | Delete site |
| GET | `/api/sites/:name/components` | components.html content |
| GET | `/api/sites/:name/instructions` | instructions.md content |
| GET | `/api/sites/:name/agent-prompt` | AI generation prompt |
| GET | `/api/sites/:name/preview/:file` | Preview captured HTML |
| DELETE | `/api/sites/:name/pages/:file` | Delete a capture |

## Development

```bash
# Install dependencies
bun install

# Run dev server with hot reload
bun --hot server.ts

# Build for npm
bun run build

# Publish
npm publish
```

## Requirements

- Node.js 18+ (or Bun)
- Chrome browser (for the capture extension)

## License

MIT
