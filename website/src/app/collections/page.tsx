import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  COLLECTION_SECTION_LABEL,
  type CollectionCategory,
  type CollectionEntry,
  collectionLogoFilter,
  collectionLogoInitials,
  collections,
} from "@/data/collections";

function CollectionCard({ site }: { site: CollectionEntry }) {
  const logoFilter = collectionLogoFilter(site);

  return (
    <div
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
        {site.logoUrl ? (
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
      <Link
        href={`/collection/${site.slug}`}
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
      </Link>
    </div>
  );
}

const CATEGORY_ORDER: CollectionCategory[] = ["web-app", "landing"];

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
              maxWidth: "640px",
            }}
          >
            Browse design systems extracted from popular sites. They are grouped by capture context—product UI versus
            marketing pages—so you can grab the kind of surface you are actually building.
          </p>

          {CATEGORY_ORDER.map((category) => {
            const sites = collections.filter((c) => c.category === category);
            const { title, blurb } = COLLECTION_SECTION_LABEL[category];
            return (
              <div key={category} style={{ marginBottom: category === "landing" ? 0 : "56px" }}>
                <h2
                  style={{
                    fontSize: "29.6845px",
                    fontWeight: 500,
                    lineHeight: "39.1835px",
                    letterSpacing: "-0.296845px",
                    color: "rgb(255, 255, 255)",
                    margin: "0 0 8px",
                  }}
                >
                  {title}
                </h2>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    lineHeight: "24px",
                    letterSpacing: "-0.15px",
                    color: "rgba(255, 255, 255, 0.5)",
                    margin: "0 0 28px",
                    maxWidth: "720px",
                  }}
                >
                  {blurb}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "24px" }}>
                  {sites.map((site) => (
                    <CollectionCard key={site.slug} site={site} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
