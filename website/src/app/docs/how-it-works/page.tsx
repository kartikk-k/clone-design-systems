import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header />

      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Link
            href="/docs"
            className="no-underline"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "22.96px",
              letterSpacing: "-0.14px",
              color: "rgba(255, 255, 255, 0.6)",
              marginBottom: "24px",
              display: "inline-block",
            }}
          >
            &larr; Back to Docs
          </Link>

          <h1
            style={{
              fontSize: "47.1587px",
              fontWeight: 500,
              lineHeight: "54.6704px",
              letterSpacing: "-1.39793px",
              color: "rgb(255, 255, 255)",
              margin: "0 0 16px",
            }}
          >
            How It Works
          </h1>
          <p
            style={{
              fontSize: "17.8948px",
              fontWeight: 500,
              lineHeight: "28px",
              letterSpacing: "-0.178948px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 48px",
            }}
          >
            Under the hood, Design Grab uses a multi-stage pipeline to go from a live website to a structured design system file.
          </p>

          {/* Stage 1 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              DOM Capture
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              The Chrome extension injects a capture script into the active tab. This script walks the entire DOM tree and records every element&apos;s computed styles — including fonts, colors, spacing, borders, and layout properties. The result is a structured JSON representation of the page.
            </p>
          </div>

          {/* Stage 2 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              HTML Rendering
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              The captured data is sent to the local server which renders it into a pixel-perfect HTML replica. This rendered HTML preserves all visual properties with inline styles, making it easy to inspect and extract values.
            </p>
          </div>

          {/* Stage 3 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              Design Token Extraction
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              The design extractor analyzes the rendered HTML across all captured pages for a site. It identifies recurring patterns — color values, font stacks, type scales, spacing rhythms, border radii, and component structures — and organizes them into a coherent design system.
            </p>
          </div>

          {/* Stage 4 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              design.md Generation
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              The final output is a structured Markdown file containing the complete design system: color palette with usage tokens, typography scale with exact values, component patterns with code snippets, layout guidelines, and dos/don&apos;ts for accurate reproduction.
            </p>
          </div>

          {/* Output */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              What you get
            </h2>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "6.08px",
                padding: "24px",
              }}
            >
              <ul
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "28px",
                  letterSpacing: "-0.14px",
                  color: "rgba(255, 255, 255, 0.6)",
                  margin: 0,
                  paddingLeft: "20px",
                }}
              >
                <li>Complete color palette with semantic token names</li>
                <li>Typography scale with font families, sizes, weights, and spacing</li>
                <li>Component code snippets (buttons, cards, nav, footer)</li>
                <li>Layout system measurements (max-width, padding, gaps)</li>
                <li>Border radius and shadow definitions</li>
                <li>Design language description and guidelines</li>
              </ul>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px" }}>
            <Link
              href="/docs/getting-started"
              className="no-underline"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
                color: "rgb(255, 255, 255)",
              }}
            >
              &larr; Previous: Getting Started
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
