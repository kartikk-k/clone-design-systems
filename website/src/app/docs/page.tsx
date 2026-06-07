import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const docs = [
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    desc: "Install the Chrome extension and capture your first design system in under a minute.",
  },
  {
    title: "How It Works",
    href: "/docs/how-it-works",
    desc: "Understand the capture pipeline — from DOM extraction to structured design.md generation.",
  },
];

export default function DocsPage() {
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
            Documentation
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
            Learn how to use Design Grab to extract and replicate design systems from any website.
          </p>

          <div className="flex flex-col" style={{ gap: "0" }}>
            {docs.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="block no-underline"
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "24px 0",
                }}
              >
                <h3
                  style={{
                    fontSize: "21.8948px",
                    fontWeight: 500,
                    lineHeight: "27.5244px",
                    letterSpacing: "-0.218948px",
                    color: "rgb(255, 255, 255)",
                    margin: "0 0 8px",
                  }}
                >
                  {doc.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "22.96px",
                    letterSpacing: "-0.14px",
                    color: "rgba(255, 255, 255, 0.6)",
                    margin: 0,
                  }}
                >
                  {doc.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
