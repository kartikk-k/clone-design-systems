import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CopyInstallCommand } from "@/components/copy-install-command";
import { CollectionTabs } from "@/components/collection-tabs";
import {
  collections,
  collectionLogoFilter,
  collectionLogoInitials,
  componentsBlobUrl,
  componentsRawUrl,
  getCollection,
  installCommand,
} from "@/data/collections";

const FALLBACK_COMPONENTS = [
  "Color system",
  "Typography scale",
  "Spacing & layout",
  "Core UI patterns",
  "Navigation",
  "Content blocks",
] as const;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = getCollection(slug);
  if (!site) {
    return { title: "Collection — Design Grab" };
  }
  return {
    title: `${site.name} — Design Grab`,
    description: site.desc,
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const site = getCollection(slug);
  if (!site) {
    notFound();
  }

  const command = installCommand(slug);
  const rawUrl = componentsRawUrl(slug);
  const blobUrl = componentsBlobUrl(slug);
  const componentList = site.components ?? FALLBACK_COMPONENTS;
  const examples = site.examples ?? [];
  const logoFilter = collectionLogoFilter(site);

  return (
    <div className="flex flex-col flex-1">
      <Header />

      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "1384px" }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between" style={{ gap: "24px" }}>
            <div>
              <Link
                href="/collections"
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
                Collections / {site.name}
              </Link>

              <div className="flex items-start" style={{ gap: "16px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {site.logoUrl ? (
                    <img
                      src={site.logoUrl}
                      alt=""
                      width={160}
                      height={48}
                      loading="eager"
                      decoding="async"
                      style={{
                        maxHeight: "48px",
                        maxWidth: "160px",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        objectPosition: "left center",
                        ...(logoFilter ? { filter: logoFilter } : {}),
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "48px",
                        height: "48px",
                        padding: "0 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        fontSize: "15px",
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
                  <h1
                    style={{
                      fontSize: "47.1587px",
                      fontWeight: 500,
                      lineHeight: "54.6704px",
                      letterSpacing: "-1.39793px",
                      color: "rgb(255, 255, 255)",
                      margin: "0 0 12px",
                    }}
                  >
                    {site.name}
                  </h1>
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
                </div>
              </div>

              <p
                style={{
                  fontSize: "17.8948px",
                  fontWeight: 500,
                  lineHeight: "28px",
                  letterSpacing: "-0.178948px",
                  color: "rgba(255, 255, 255, 0.6)",
                  margin: 0,
                }}
              >
                {site.desc}
              </p>
            </div>

            <div className="flex flex-wrap shrink-0" style={{ gap: "10px" }}>
              <a
                href={rawUrl}
                download={`${slug}-components.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center no-underline"
                style={{
                  height: "40px",
                  padding: "0 20px",
                  backgroundColor: "rgb(255, 255, 255)",
                  borderRadius: "40px",
                  color: "rgb(0, 0, 0)",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "-0.14px",
                }}
              >
                Download components
              </a>
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center no-underline"
                style={{
                  height: "40px",
                  padding: "0 20px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "40px",
                  color: "rgb(255, 255, 255)",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "-0.14px",
                }}
              >
                View on GitHub
              </a>
            </div>
          </div>

          <div style={{ marginTop: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 12px",
              }}
            >
              Add to your project
            </h2>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "22.96px",
                letterSpacing: "-0.14px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              Run this in your project to install the {site.name} design system components and instructions.
            </p>
            <CopyInstallCommand command={command} />
          </div>

          <div
            style={{
              marginTop: "48px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "6.08px",
              padding: "24px",
            }}
          >
            <CollectionTabs slug={slug} examples={examples} rawUrl={rawUrl} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
