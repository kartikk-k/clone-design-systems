import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Design Grab",
  description: "About Design Grab — an open source tool to extract and reference any website's design system for development.",
};

export default function AboutPage() {
  const h2Style = {
    fontSize: "21.8948px",
    fontWeight: 500,
    lineHeight: "27.5244px",
    letterSpacing: "-0.218948px",
    color: "rgb(255, 255, 255)",
    margin: "0 0 16px",
  } as const;

  const pStyle = {
    fontSize: "17px",
    fontWeight: 500,
    lineHeight: "27.999px",
    letterSpacing: "-0.17px",
    color: "rgba(255, 255, 255, 0.6)",
    margin: "0 0 16px",
  } as const;

  const sectionStyle = { marginBottom: "48px" } as const;

  return (
    <div className="flex flex-col flex-1">
      <Header />

      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "800px" }}>
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
            About Design Grab
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
            An open source tool for developers and designers who learn by studying great design.
          </p>

          <div style={sectionStyle}>
            <h2 style={h2Style}>What is Design Grab?</h2>
            <p style={pStyle}>
              Design Grab is an open source developer tool that lets you capture and reference the visual design system of any website. It extracts colors, typography, spacing, and component structures — the same information visible in any browser&apos;s developer tools — and organizes it into a portable reference you can use alongside AI coding agents.
            </p>
            <p style={pStyle}>
              The tool consists of a Chrome extension for capturing pages, a local server for processing and viewing captures, and a CLI for managing design systems in your projects.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Why We Built This</h2>
            <p style={pStyle}>
              Great design is meant to be studied. Developers and designers have always used browser DevTools to inspect how their favorite websites are built — examining colors, fonts, layouts, and component patterns. Design Grab simply streamlines that workflow.
            </p>
            <p style={pStyle}>
              Instead of manually inspecting elements one by one, Design Grab captures an entire page&apos;s computed styles and structures them into a format that AI coding assistants can use to build pixel-perfect UIs. It bridges the gap between &quot;I want my app to feel like that&quot; and actually building it.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>How It Works</h2>
            <p style={pStyle}>
              Design Grab only captures publicly visible information — the same HTML and computed CSS that any visitor sees when they open a website. It does not access private data, backend systems, source code, user accounts, or any information not already visible in the browser.
            </p>
            <p style={pStyle}>
              All processing happens locally on your machine. The Chrome extension sends captured data to a local server running on your computer. Nothing is sent to external servers unless you explicitly use the public registry feature.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Intellectual Property</h2>
            <p style={pStyle}>
              Design Grab does not own, claim, or assert any rights over the design systems, visual assets, or intellectual property of any third-party website. All trademarks, logos, and brand identities remain the exclusive property of their respective owners.
            </p>
            <p style={pStyle}>
              Extracted design references are intended for personal learning, internal development, and design inspiration — not for counterfeiting, brand impersonation, or redistribution.
            </p>
            <p style={pStyle}>
              If you are the owner of a website and would like your design system removed from the public registry, please contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
              We honor all removal requests promptly.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Open Source</h2>
            <p style={pStyle}>
              Design Grab is fully open source under the MIT License. You can inspect every line of code, contribute improvements, or fork it for your own use. Transparency is core to how we operate.
            </p>
            <p style={pStyle}>
              <a href="https://github.com/kartikk-k/designgrab" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>View the source on GitHub &rarr;</a>
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>Contact</h2>
            <p style={pStyle}>
              For questions, feedback, takedown requests, or anything else, reach out at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px", display: "flex", gap: "24px" }}>
            <Link href="/terms" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              Terms of Service &rarr;
            </Link>
            <Link href="/privacy" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              Privacy Policy &rarr;
            </Link>
            <Link href="/contact" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
              Contact Us &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
