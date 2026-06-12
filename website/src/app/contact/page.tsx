import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Design Grab",
  description: "Contact Design Grab for takedown requests, questions, or feedback.",
};

export default function ContactPage() {
  const pStyle = {
    fontSize: "17px",
    fontWeight: 500,
    lineHeight: "27.999px",
    letterSpacing: "-0.17px",
    color: "rgba(255, 255, 255, 0.6)",
    margin: "0 0 16px",
  } as const;

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    padding: "32px",
    marginBottom: "24px",
  } as const;

  const cardTitleStyle = {
    fontSize: "17px",
    fontWeight: 600,
    lineHeight: "27.999px",
    letterSpacing: "-0.17px",
    color: "rgb(255, 255, 255)",
    margin: "0 0 8px",
  } as const;

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
            Contact Us
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
            Have a question, takedown request, or feedback? We&apos;d love to hear from you.
          </p>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>General Inquiries</h2>
            <p style={{ ...pStyle, margin: "0 0 12px" }}>
              For questions about Design Grab, feature requests, or general feedback:
            </p>
            <a
              href="mailto:hellokartikk@gmail.com"
              style={{
                fontSize: "17px",
                fontWeight: 500,
                color: "rgb(255, 255, 255)",
                textDecoration: "underline",
              }}
            >
              hellokartikk@gmail.com
            </a>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Takedown &amp; Removal Requests</h2>
            <p style={{ ...pStyle, margin: "0 0 12px" }}>
              If you are the owner or authorized representative of a website whose design system appears in our public registry and you want it removed, please email us with:
            </p>
            <ul style={{ ...pStyle, paddingLeft: "24px", listStyleType: "disc", margin: "0 0 16px" }}>
              <li style={{ marginBottom: "8px" }}>The name of the website or design system</li>
              <li style={{ marginBottom: "8px" }}>Your role or relationship to the website (owner, legal representative, etc.)</li>
              <li style={{ marginBottom: "8px" }}>A brief description of the concern</li>
            </ul>
            <p style={{ ...pStyle, margin: "0 0 12px" }}>
              We process all removal requests promptly, typically within 5 business days.
            </p>
            <a
              href="mailto:hellokartikk@gmail.com?subject=Takedown%20Request"
              style={{
                fontSize: "17px",
                fontWeight: 500,
                color: "rgb(255, 255, 255)",
                textDecoration: "underline",
              }}
            >
              hellokartikk@gmail.com
            </a>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Bug Reports &amp; Feature Requests</h2>
            <p style={{ ...pStyle, margin: "0 0 12px" }}>
              For technical issues, bugs, or feature requests, please open an issue on GitHub:
            </p>
            <a
              href="https://github.com/kartikk-k/designgrab/issues"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "17px",
                fontWeight: 500,
                color: "rgb(255, 255, 255)",
                textDecoration: "underline",
              }}
            >
              github.com/kartikk-k/designgrab/issues
            </a>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px", display: "flex", gap: "24px" }}>
            <Link href="/about" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              About &rarr;
            </Link>
            <Link href="/terms" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              Terms of Service &rarr;
            </Link>
            <Link href="/privacy" className="no-underline" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.14px", color: "rgba(255, 255, 255, 0.6)" }}>
              Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
