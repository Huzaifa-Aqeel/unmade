import { getDb, now, type TryonTask } from "@/lib/db";
import { TRYON_DIR, tryonUrl } from "@/lib/media";
import { friendlyTryOnError, getTask } from "@/lib/youcam";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  const db = getDb();

  const task = db.prepare("SELECT * FROM tryon_tasks WHERE id = ?").get(id) as TryonTask | undefined;
  if (!task || !sessionId || task.session_id !== sessionId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (task.status !== "pending") {
    return NextResponse.json({ status: task.status, url: task.result_url, error: task.error });
  }

  const result = await getTask(task.youcam_task_id);

  if (result.status === "success" && result.resultUrl) {
    try {
      const res = await fetch(result.resultUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("download failed");
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(TRYON_DIR, { recursive: true });
      await fs.writeFile(path.join(TRYON_DIR, `${task.id}.jpg`), buffer);

      const url = tryonUrl(task.id, task.session_id);
      db.prepare("UPDATE tryon_tasks SET status = 'success', result_url = ? WHERE id = ?").run(url, task.id);
      db.prepare(
        `INSERT INTO events (id, collection_id, design_id, session_id, type, created_at)
         VALUES (?, ?, ?, ?, 'tryon', ?)`,
      ).run(`evt_${task.id}`, task.collection_id, task.design_id, task.session_id, now());

      return NextResponse.json({ status: "success", url });
    } catch {
      db.prepare("UPDATE tryon_tasks SET status = 'error', error = ? WHERE id = ?").run(
        "We couldn't save the preview. Please try again.",
        task.id,
      );
      return NextResponse.json({ status: "error", error: "We couldn't save the preview. Please try again." });
    }
  }

  if (result.status === "error") {
    const message = friendlyTryOnError(result.error);
    db.prepare("UPDATE tryon_tasks SET status = 'error', error = ? WHERE id = ?").run(message, task.id);
    return NextResponse.json({ status: "error", error: message });
  }

  return NextResponse.json({ status: "pending" });
}
