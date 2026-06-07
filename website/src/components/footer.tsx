import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="w-full flex justify-center"
      style={{ backgroundColor: "rgb(0, 0, 0)", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}
    >
      <div
        className="w-full flex flex-col sm:flex-row justify-between"
        style={{ maxWidth: "1384px", padding: "48px 32px", gap: "48px" }}
      >
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: "22.96px", letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
            Product
          </span>
          <Link href="/collections" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            Collections
          </Link>
          <Link href="/docs" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            Documentation
          </Link>
          <a href="#install" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            Chrome Extension
          </a>
        </div>
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: "22.96px", letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
            Resources
          </span>
          <Link href="/docs/getting-started" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            Getting Started
          </Link>
          <Link href="/docs/how-it-works" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            How It Works
          </Link>
        </div>
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: "22.96px", letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
            Community
          </span>
          <a href="https://github.com/nicepkg/designgrab" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            GitHub
          </a>
          <a href="https://github.com/nicepkg/designgrab/issues" target="_blank" rel="noopener noreferrer" className="no-underline" style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" }}>
            Issues
          </a>
        </div>
        <div className="flex flex-col" style={{ gap: "12px", maxWidth: "300px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: "22.96px", letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
            Design Grab
          </span>
          <p style={{ fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
            Open source tool to extract and clone any website&apos;s design system. Built for designers and developers.
          </p>
        </div>
      </div>
    </footer>
  );
}
