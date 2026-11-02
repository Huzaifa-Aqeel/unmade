import { DESIGN_DIR, MIME, extensionOf } from "@/lib/media";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/** Serves designer-uploaded concept images. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;
  if (segments.length !== 2 || segments[0] !== "designs") {
    return new Response("Not found", { status: 404 });
  }

  const fileName = segments[1];
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.startsWith(".")) {
    return new Response("Not found", { status: 404 });
  }

  const type = MIME[extensionOf(fileName)];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const file = await fs.readFile(path.join(DESIGN_DIR, fileName));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
