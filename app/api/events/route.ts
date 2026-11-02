import { getDb, now, uid } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { collection_id?: string; design_id?: string | null; session_id?: string; type?: string }
    | null;

  if (!body?.collection_id || !body.session_id || body.type !== "view") {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const db = getDb();
  // One visit per session per collection, so visitor counts stay honest.
  const existing = db
    .prepare("SELECT 1 FROM events WHERE collection_id = ? AND session_id = ? AND type = 'view'")
    .get(body.collection_id, body.session_id);

  if (!existing) {
    db.prepare(
      `INSERT INTO events (id, collection_id, design_id, session_id, type, created_at)
       VALUES (?, ?, ?, ?, 'view', ?)`,
    ).run(uid("evt_"), body.collection_id, body.design_id ?? null, body.session_id, now());
  }

  return NextResponse.json({ ok: true });
}
