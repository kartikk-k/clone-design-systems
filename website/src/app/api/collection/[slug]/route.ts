import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCollection, componentsRawUrl } from "@/data/collections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const url = new URL(_request.url);
  const file = url.searchParams.get("file") || "components";

  if (file !== "components") {
    return NextResponse.json({ error: "Only components file is available" }, { status: 400 });
  }

  // Try local registry first (for development and self-hosted)
  const localPath = join(process.cwd(), "..", "registry", slug, "components.html");
  if (existsSync(localPath)) {
    const content = await readFile(localPath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Fall back to GitHub registry
  const rawUrl = componentsRawUrl(slug);
  try {
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "designgrab-website" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Components not available (${res.status})` },
        { status: res.status }
      );
    }

    const content = await res.text();
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
