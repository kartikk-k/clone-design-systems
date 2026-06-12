"use client";

import { useState } from "react";
import type { CollectionExample } from "@/data/collections";

type TabId = "components" | "examples";

const tabLabel: Record<TabId, string> = {
  components: "Components",
  examples: "Live examples",
};

export function CollectionTabs({
  components,
  examples,
}: {
  components: readonly string[];
  examples: readonly CollectionExample[];
}) {
  const [tab, setTab] = useState<TabId>("components");

  return (
    <div>
      <div className="flex border-b" style={{ borderColor: "rgba(255, 255, 255, 0.12)", gap: "8px" }}>
        {(["components", "examples"] as const).map((id) => (
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
      </div>

      <div style={{ paddingTop: "24px" }}>
        {tab === "components" && (
          <div>
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
              Highlights from this collection&apos;s design.md. Open the file for the full token set and usage notes.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: "20px",
                fontSize: "15px",
                fontWeight: 500,
                lineHeight: "26px",
                letterSpacing: "-0.15px",
                color: "rgba(255, 255, 255, 0.85)",
              }}
            >
              {components.map((c) => (
                <li key={c} style={{ marginBottom: "6px" }}>
                  {c}
                </li>
              ))}
            </ul>
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
                No live demos are listed for this collection yet. Ship something with this design.md and we can link it
                here.
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
