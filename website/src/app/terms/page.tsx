import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Design Grab",
  description: "Terms of Service for Design Grab, an open source tool for extracting website design systems.",
};

export default function TermsPage() {
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
            Terms of Service
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
            <h2 style={h2Style}>1. Acceptance of Terms</h2>
            <p style={pStyle}>
              By accessing or using Design Grab (&quot;the Service&quot;), including the website, Chrome extension, CLI tool, and any associated services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Description of Service</h2>
            <p style={pStyle}>
              Design Grab is an open source developer tool that extracts visual design tokens (colors, typography, spacing, and component structures) from publicly accessible websites. The tool captures the computed CSS styles and DOM structure of web pages for the purpose of design reference and development workflow optimization.
            </p>
            <p style={pStyle}>
              The Service is provided &quot;as is&quot; and is intended solely as a development and design reference tool.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Intellectual Property Disclaimer</h2>
            <p style={pStyle}>
              <strong style={{ color: "rgb(255, 255, 255)" }}>Design Grab does not own, claim ownership of, or assert any rights over the design systems, visual assets, CSS styles, logos, trademarks, copyrighted materials, or any other intellectual property belonging to third-party websites.</strong>
            </p>
            <p style={pStyle}>
              All design elements extracted by the tool remain the exclusive intellectual property of their respective owners. The names, logos, and visual identities of captured websites are trademarks or registered trademarks of their respective holders.
            </p>
            <p style={pStyle}>
              Extracted design data is provided solely for personal reference, educational purposes, and internal development use. It is not intended for redistribution, commercial resale, or misrepresentation of affiliation with any third party.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. User Responsibilities</h2>
            <p style={pStyle}>
              As a user of Design Grab, you agree to:
            </p>
            <ul style={{ ...pStyle, paddingLeft: "24px", listStyleType: "disc" }}>
              <li style={{ marginBottom: "8px" }}>Use extracted design data only for lawful purposes, such as personal learning, internal design reference, and development inspiration.</li>
              <li style={{ marginBottom: "8px" }}>Not use the tool to infringe upon, misappropriate, or violate any third party&apos;s intellectual property rights, trade secrets, or proprietary rights.</li>
              <li style={{ marginBottom: "8px" }}>Not redistribute, sell, sublicense, or publicly share extracted design systems in a way that could constitute infringement or misrepresentation.</li>
              <li style={{ marginBottom: "8px" }}>Not use the tool to create counterfeit or deceptive reproductions of another entity&apos;s brand, website, or product.</li>
              <li style={{ marginBottom: "8px" }}>Comply with all applicable laws, regulations, and third-party terms of service when using the tool.</li>
              <li style={{ marginBottom: "8px" }}>Respect robots.txt directives, terms of use, and access restrictions of any website you capture.</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Public Registry &amp; Collections</h2>
            <p style={pStyle}>
              Design Grab may host a public registry of pre-extracted design system references. These collections are provided for educational and reference purposes only. They represent publicly observable visual characteristics of websites and do not contain proprietary source code, private assets, or confidential information.
            </p>
            <p style={pStyle}>
              If you are the owner or authorized representative of a website whose design system appears in our public registry and you wish to have it removed, please contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
              We will process removal requests promptly, typically within 5 business days.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. DMCA &amp; Takedown Requests</h2>
            <p style={pStyle}>
              We respect intellectual property rights and respond to valid takedown notices. If you believe that any content hosted by Design Grab infringes your copyright or other intellectual property rights, please send a written notice to{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>{" "}
              with the following information:
            </p>
            <ul style={{ ...pStyle, paddingLeft: "24px", listStyleType: "disc" }}>
              <li style={{ marginBottom: "8px" }}>Identification of the copyrighted work or intellectual property you claim is being infringed.</li>
              <li style={{ marginBottom: "8px" }}>Identification of the material on Design Grab that you claim is infringing, with sufficient detail for us to locate it.</li>
              <li style={{ marginBottom: "8px" }}>Your contact information (name, email, phone number).</li>
              <li style={{ marginBottom: "8px" }}>A statement that you have a good faith belief that the use of the material is not authorized by the rights owner, its agent, or the law.</li>
              <li style={{ marginBottom: "8px" }}>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the rights owner or authorized to act on their behalf.</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. No Warranty</h2>
            <p style={pStyle}>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the accuracy, completeness, or reliability of any design data extracted by the tool.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>8. Limitation of Liability</h2>
            <p style={pStyle}>
              To the fullest extent permitted by law, Design Grab and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data or goodwill, arising from your use of the Service.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>9. Open Source License</h2>
            <p style={pStyle}>
              The Design Grab source code is released under the MIT License. This license governs the use, modification, and distribution of the software itself. This Terms of Service applies to the use of the hosted service, public registry, and any associated services provided by Design Grab.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>10. Changes to Terms</h2>
            <p style={pStyle}>
              We may update these Terms of Service from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the Service after any changes constitutes acceptance of the new terms.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>11. Contact</h2>
            <p style={pStyle}>
              For questions about these Terms of Service, takedown requests, or any other concerns, contact us at{" "}
              <a href="mailto:hellokartikk@gmail.com" style={{ color: "rgb(255, 255, 255)", textDecoration: "underline" }}>hellokartikk@gmail.com</a>.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px", display: "flex", gap: "24px" }}>
            <Link href="/privacy" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" }}>
              Privacy Policy &rarr;
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
