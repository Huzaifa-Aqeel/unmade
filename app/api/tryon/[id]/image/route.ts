import { getDb, type TryonTask } from "@/lib/db";
import { TRYON_DIR } from "@/lib/media";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * Serves a customer's try-on preview. Restricted to the browser session that
 * generated it — designers and other visitors cannot reach these images.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";

  if (!/^[a-zA-Z0-9_-]+$/.test(id) || !sessionId) {
    return new Response("Not found", { status: 404 });
  }

  const task = getDb()
    .prepare("SELECT session_id, status FROM tryon_tasks WHERE id = ?")
    .get(id) as Pick<TryonTask, "session_id" | "status"> | undefined;

  if (!task || task.session_id !== sessionId || task.status !== "success") {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(TRYON_DIR, `${id}.jpg`));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Preview expired", { status: 404 });
  }
}
