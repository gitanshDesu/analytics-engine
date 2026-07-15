import { readFile } from "fs/promises";
import path from "path";

// Serves the sibling ../sdk/index.js as-is — no CDN exists yet (SDK_SCRIPT_URL
// points here for local dev), and this avoids keeping a duplicate copy in
// sync under frontend/public.
const SDK_PATH = path.join(process.cwd(), "..", "sdk", "index.js");

export async function GET() {
  const contents = await readFile(SDK_PATH, "utf-8");
  return new Response(contents, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
