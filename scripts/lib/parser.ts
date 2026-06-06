/** Parse figh2d payload from captured HTML file */

import type { FigH2DData } from "./types.ts";

export function parseFigH2D(rawHtml: string): FigH2DData {
  const s1 = rawHtml.indexOf("figh2d)");
  const s2 = rawHtml.indexOf("(/figh2d)", s1);
  if (s1 === -1 || s2 === -1) {
    throw new Error("No figh2d payload found in file");
  }

  const b64 = rawHtml.slice(s1 + 7, s2);
  return JSON.parse(Buffer.from(b64, "base64").toString()) as FigH2DData;
}

/** Build a map of asset URLs to data URIs from the captured blobs */
export function buildAssetMap(data: FigH2DData): Map<string, string> {
  const map = new Map<string, string>();

  for (const [url, asset] of Object.entries(data.assets)) {
    if (asset.blob?.base64Blob) {
      const b64Data = asset.blob.base64Blob;
      if (b64Data.startsWith("data:")) {
        const rawB64 = b64Data.split(",")[1] || "";
        map.set(url, `data:${asset.blob.type};base64,${rawB64}`);
      }
    }
  }

  return map;
}
