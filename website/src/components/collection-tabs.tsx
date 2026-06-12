"use client";

import { useState } from "react";
import type { CollectionExample } from "@/data/collections";

type TabId = "preview" | "examples";

const tabLabel: Record<TabId, string> = {
  preview: "Components preview",
  examples: "Live examples",
};

export function CollectionTabs({
  slug,
  examples,
  rawUrl,
}: {
  slug: string;
  examples: readonly CollectionExample[];
  rawUrl: string;
}) {
  const [tab, setTab] = useState<TabId>("preview");

  return (
    <div>
      <div className="flex items-center border-b" style={{ borderColor: "rgba(255, 255, 255, 0.12)", gap: "8px" }}>
        {(["preview", "examples"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="cursor-pointer border-0 bg-transparent"
            style={{
              padding: "12px 4px",
              marginBottom: "-1px",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.14px",
              color: tab === id ? "rgb(255, 255, 255)" : "rgba(255, 255, 255, 0.44)",
              borderBottom: tab === id ? "2px solid rgb(255, 255, 255)" : "2px solid transparent",
            }}
          >
            {tabLabel[id]}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <a
            href={rawUrl}
            download={`${slug}-components.html`}
            className="inline-flex items-center justify-center no-underline"
            style={{
              height: "32px",
              padding: "0 14px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "13px",
              fontWeight: 500,
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
        </div>
      </div>

      <div style={{ paddingTop: "24px" }}>
        {tab === "preview" && (
          <div style={{ overflow: "auto", borderRadius: "6px", backgroundColor: "#111" }}>
            <iframe
              src={`/api/collection/${slug}?file=components`}
              title={`${slug} components preview`}
              style={{
                width: "100%",
                minWidth: "600px",
                height: "80vh",
                border: "none",
                display: "block",
              }}
            />
          </div>
        )}

        {tab === "examples" && (
          <div className="flex flex-col" style={{ gap: "16px" }}>
            {examples.length === 0 ? (
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
                No live demos listed yet. Ship something with this design system and we can link it here.
              </p>
            ) : (
              examples.map((ex) => (
                <div
                  key={ex.title}
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "6.08px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 500,
                      lineHeight: "24px",
                      letterSpacing: "-0.17px",
                      color: "rgb(255, 255, 255)",
                      margin: "0 0 8px",
                    }}
                  >
                    {ex.title}
                  </h3>
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
                    {ex.description}
                  </p>
                  {ex.url ? (
                    <a
                      href={ex.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center no-underline"
                      style={{
                        height: "36px",
                        padding: "0 16px",
                        backgroundColor: "rgb(255, 255, 255)",
                        borderRadius: "9999px",
                        color: "rgb(0, 0, 0)",
                        fontSize: "14px",
                        fontWeight: 500,
                        letterSpacing: "-0.14px",
                      }}
                    >
                      Open live site
                    </a>
                  ) : (
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "rgba(255, 255, 255, 0.44)",
                      }}
                    >
                      Public URL not linked yet
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
