import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/** Logo URLs from https://svgl.app where available; optional entries use a typographic mark. */
const collections = [
  {
    name: "OpenAI",
    slug: "openai",
    logoUrl: "https://svgl.app/library/openai_dark.svg",
    desc: "Pure black canvas with white typography and translucent layers. Tight tracking, medium weight, shadow-free design.",
    tags: ["Dark", "Minimal", "Editorial"],
  },
  {
    name: "Cursor",
    slug: "cursor",
    logoUrl: "https://svgl.app/library/cursor_dark.svg",
    desc: "Developer-focused IDE interface with dark backgrounds, precise spacing, and monospace accent typography.",
    tags: ["Dark", "Developer", "Technical"],
  },
  {
    name: "Gemini",
    slug: "gemini",
    logoUrl: "https://svgl.app/library/gemini.svg",
    desc: "Google's AI product with clean surfaces, rounded elements, and a balanced light/dark color system.",
    tags: ["Clean", "Rounded", "Google"],
  },
  {
    name: "Stripe",
    slug: "stripe",
    logoUrl: "https://svgl.app/library/stripe.svg",
    desc: "Refined gradients, precise grids, and a sophisticated color palette built for trust and developer experience.",
    tags: ["Gradient", "Precise", "Finance"],
  },
  {
    name: "Vercel",
    slug: "vercel",
    logoUrl: "https://svgl.app/library/vercel_dark.svg",
    desc: "Monochrome minimalism with sharp geometry, tight spacing, and a focus on developer tools.",
    tags: ["Monochrome", "Minimal", "Developer"],
  },
  {
    name: "Supabase",
    slug: "supabase",
    logoUrl: "https://svgl.app/library/supabase.svg",
    desc: "Dark-first design with green accents, developer-friendly patterns, and clear information hierarchy.",
    tags: ["Dark", "Green", "Developer"],
  },
  {
    name: "Harvey",
    slug: "harvey",
    desc: "Legal AI with restrained elegance, serif accents, and muted professional tones.",
    tags: ["Professional", "Serif", "Legal"],
  },
  {
    name: "Stripe Atlas",
    slug: "stripe-atlas",
    logoUrl: "https://svgl.app/library/stripe.svg",
    desc: "Focused startup incorporation flow with Stripe's refined design language adapted for forms and guides.",
    tags: ["Forms", "Startup", "Finance"],
  },
  {
    name: "Tembo",
    slug: "tembo",
    logoUrl: "https://svgl.app/library/tembo.svg",
    desc: "Cloud database platform with warm accents, clear dashboards, and developer-oriented component patterns.",
    tags: ["Dashboard", "Warm", "Database"],
  },
  {
    name: "Sarvam",
    slug: "sarvam",
    desc: "Indian AI platform with vibrant colors, cultural design elements, and clear product storytelling.",
    tags: ["Vibrant", "AI", "Cultural"],
  },
  {
    name: "X (Twitter)",
    slug: "x",
    logoUrl: "https://svgl.app/library/x.svg",
    desc: "Social media platform with high-density feeds, blue accents, and real-time interaction patterns.",
    tags: ["Social", "Feed", "Blue"],
  },
] as const;

function collectionLogoInitials(name: string) {
  return name
    .split(/[\s(&)]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function CollectionsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header />

      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "1384px" }}>
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
            Collections
          </h1>
          <p
            style={{
              fontSize: "17.8948px",
              fontWeight: 500,
              lineHeight: "28px",
              letterSpacing: "-0.178948px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 48px",
              maxWidth: "600px",
            }}
          >
            Browse design systems extracted from popular websites. Each collection includes colors, typography, spacing, components, and usage guidelines.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "24px" }}>
            {collections.map((site) => (
              <div
                key={site.slug}
                id={site.slug}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6.08px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {"logoUrl" in site && site.logoUrl ? (
                    <img
                      src={site.logoUrl}
                      alt=""
                      width={160}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      style={{
                        maxHeight: "36px",
                        maxWidth: "160px",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        objectPosition: "left center",
                        filter: "brightness(0) invert(1)",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "36px",
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        fontSize: "13px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        color: "rgb(255, 255, 255)",
                      }}
                    >
                      {collectionLogoInitials(site.name)}
                    </span>
                  )}
                </div>
                <div>
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
                    {site.name}
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
                    {site.desc}
                  </p>
                </div>
                <div className="flex flex-wrap" style={{ gap: "8px" }}>
                  {site.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: "28px",
                        padding: "0 12px",
                        backgroundColor: "rgb(31, 31, 31)",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 500,
                        lineHeight: "19.68px",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href={`https://github.com/nicepkg/designgrab/blob/main/.data/${site.slug}/design.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center no-underline mt-auto"
                  style={{
                    height: "36px",
                    padding: "0 16px",
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderRadius: "9999px",
                    color: "rgb(255, 255, 255)",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.14px",
                    alignSelf: "flex-start",
                  }}
                >
                  View design.md
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
