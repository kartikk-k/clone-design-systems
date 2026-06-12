import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Design Grab",
  description: "Privacy Policy for Design Grab. Learn how we handle data when you use our open source design system extraction tool.",
};

export default function PrivacyPage() {
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
            Privacy Policy
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
            Last updated: June 2025
          </p>

          <div style={sectionStyle}>
            <h2 style={h2Style}>1. Overview</h2>
            <p style={pStyle}>
              Design Grab is an open source, privacy-focused tool. We are committed to protecting your privacy and being transparent about what data we collect and how we use it. This Privacy Policy applies to the Design Grab website (designgrab.vercel.app), Chrome extension, CLI tool, and any related services.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Data We Collect</h2>

            <h3 style={{ ...h2Style, fontSize: "17px", margin: "0 0 12px" }}>Website</h3>
            <p style={pStyle}>
              The Design Grab website does not collect personal information, use cookies for tracking, or employ third-party analytics. Standard web server logs (IP address, browser type, pages visited) may be collected by our hosting provider (Vercel) as part of their service. These logs are subject to{" "}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>Vercel&apos;s Privacy Policy</a>.
            </p>

            <h3 style={{ ...h2Style, fontSize: "17px", margin: "0 0 12px" }}>Chrome Extension</h3>
            <p style={pStyle}>
              The Chrome extension operates entirely locally. When you capture a page, the extension extracts the DOM structure and computed CSS styles from the active tab and sends this data exclusively to your local server (localhost). No data is transmitted to Design Grab servers, third parties, or any external endpoint. The extension stores only your server URL preference in Chrome&apos;s local storage.
            </p>

            <h3 style={{ ...h2Style, fontSize: "17px", margin: "0 0 12px" }}>CLI Tool &amp; Local Server</h3>
            <p style={pStyle}>
              The CLI tool and local dashboard server run entirely on your machine. All captured data is stored locally in your home directory (~/.designgrab/). No data is sent to external servers. The CLI may make requests to GitHub&apos;s public API when you use the public registry feature (designgrab list --public or designgrab add --public).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Data from Captured Websites</h2>
            <p style={pStyle}>
              When you use Design Grab to capture a website, the tool extracts publicly visible information including HTML structure, computed CSS styles, color values, typography settings, and layout properties. This data represents what any visitor can observe in their browser&apos;s developer tools.
            </p>
            <p style={pStyle}>
              <strong style={{ color: "rgb(255, 255, 255)" }}>Design Grab does not extract or store:</strong>
            </p>
            <ul style={{ ...pStyle, paddingLeft: "24px", listStyleType: "disc" }}>
              <li style={{ marginBottom: "8px" }}>User credentials, passwords, or authentication tokens</li>
              <li style={{ marginBottom: "8px" }}>Personal data of website visitors or users</li>
              <li style={{ marginBottom: "8px" }}>Cookies, session data, or local storage content</li>
              <li style={{ marginBottom: "8px" }}>Private API responses or backend data</li>
              <li style={{ marginBottom: "8px" }}>Form submissions or user-generated content</li>
            </ul>
            <p style={pStyle}>
              The extension explicitly strips all JavaScript from captures to prevent execution of any captured code.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. Public Registry</h2>
            <p style={pStyle}>
              The Design Grab public registry hosts pre-extracted design system references for educational purposes. These contain only publicly observable visual properties (colors, fonts, spacing, component structures) and do not include any private, proprietary, or personally identifiable information.
            </p>
            <p style={pStyle}>
              If you are the owner of a website whose design system appears in the public registry and wish to have it removed, please contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Third-Party Services</h2>
            <p style={pStyle}>
              The only third-party services involved in Design Grab are:
            </p>
            <ul style={{ ...pStyle, paddingLeft: "24px", listStyleType: "disc" }}>
              <li style={{ marginBottom: "8px" }}><strong style={{ color: "rgb(255, 255, 255)" }}>Vercel</strong> — Hosts the website. Subject to their privacy policy.</li>
              <li style={{ marginBottom: "8px" }}><strong style={{ color: "rgb(255, 255, 255)" }}>GitHub</strong> — Hosts the source code and public registry. Used by the CLI for the public registry feature.</li>
              <li style={{ marginBottom: "8px" }}><strong style={{ color: "rgb(255, 255, 255)" }}>npm</strong> — Distributes the CLI package.</li>
            </ul>
            <p style={pStyle}>
              We do not use any analytics, tracking, advertising, or data brokerage services.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. Children&apos;s Privacy</h2>
            <p style={pStyle}>
              Design Grab is a developer tool and is not directed at children under the age of 13. We do not knowingly collect personal information from children.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. Your Rights</h2>
            <p style={pStyle}>
              Since Design Grab does not collect or store personal data, there is generally no personal data to access, correct, or delete. If you believe we hold any information about you, or if you are a website owner requesting removal of your design system from the public registry, contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>8. Changes to This Policy</h2>
            <p style={pStyle}>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>9. Contact</h2>
            <p style={pStyle}>
              For questions about this Privacy Policy or to exercise any of your rights, contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px", display: "flex", gap: "24px" }}>
            <Link href="/terms" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
              Terms of Service &rarr;
            </Link>
            <Link href="/contact" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              Contact Us &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
