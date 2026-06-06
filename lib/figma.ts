import { join } from "node:path";

export interface FigmaFrame {
  url: string;
  fileKey: string;
  nodeId: string;
  fileName: string;
}

export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/").filter(Boolean);

  // Handle /design/:fileKey/branch/:branchKey/:fileName or /design/:fileKey/:fileName
  let fileKey = "";
  const designIdx = pathParts.indexOf("design");
  const makeIdx = pathParts.indexOf("make");
  const boardIdx = pathParts.indexOf("board");
  const slidesIdx = pathParts.indexOf("slides");

  const typeIdx = [designIdx, makeIdx, boardIdx, slidesIdx].find((i) => i !== -1);
  if (typeIdx !== undefined && typeIdx !== -1) {
    fileKey = pathParts[typeIdx + 1] ?? "";
    // If there's a branch, use the branch key instead
    const maybeBranch = pathParts[typeIdx + 2];
    const branchKey = pathParts[typeIdx + 3];
    if (maybeBranch === "branch" && branchKey) {
      fileKey = branchKey;
    }
  }

  // Extract nodeId from query param, converting "-" to ":"
  const nodeIdRaw = parsed.searchParams.get("node-id") ?? "";
  const nodeId = nodeIdRaw.replace(/-/g, ":");

  return { fileKey, nodeId };
}

export function parseFigmaUrls(urls: string[]): FigmaFrame[] {
  return urls.map((url, i) => {
    const { fileKey, nodeId } = parseFigmaUrl(url);
    return {
      url,
      fileKey,
      nodeId,
      fileName: `figma-frame-${i + 1}`,
    };
  });
}

export async function saveFigmaState(
  dataDir: string,
  frames: FigmaFrame[]
): Promise<void> {
  const state = {
    status: "pending",
    frames,
    rawDir: join(dataDir, "raw"),
  };
  await Bun.write(join(dataDir, "_figma-state.json"), JSON.stringify(state, null, 2));
}

export async function isRawDataReady(
  dataDir: string,
  frames: FigmaFrame[]
): Promise<boolean> {
  for (const frame of frames) {
    const file = Bun.file(join(dataDir, "raw", `${frame.fileName}.json`));
    if (!(await file.exists())) return false;
  }
  return true;
}
