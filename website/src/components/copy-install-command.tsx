"use client";

import { useCallback, useState } from "react";

export function CopyInstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [command]);

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: "6.08px",
        padding: "16px 20px",
      }}
    >
      <code
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "14px",
          lineHeight: "22px",
          color: "rgb(255, 255, 255)",
          wordBreak: "break-all",
        }}
      >
        {command}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 cursor-pointer border-0"
        style={{
          height: "36px",
          padding: "0 16px",
          backgroundColor: copied ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.12)",
          borderRadius: "9999px",
          color: "rgb(255, 255, 255)",
          fontSize: "14px",
          fontWeight: 500,
          letterSpacing: "-0.14px",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
