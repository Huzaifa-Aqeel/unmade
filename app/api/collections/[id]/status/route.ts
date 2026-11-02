import { getDb, type Collection } from "@/lib/db";
import { currentDesigner, designerOwnsCollection } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Publish or close a drop (FR-01 / FR-08). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { admin_token?: string; status?: "published" | "closed" | "draft" }
    | null;

  const db = getDb();
  const collection = db.prepare("SELECT * FROM collections WHERE id = ?").get(id) as Collection | undefined;
  if (!collection) return NextResponse.json({ error: "Drop not found." }, { status: 404 });

  // Authorised by owning designer session, or by the collection's private link.
  const designer = await currentDesigner();
  const allowed =
    (designer && designerOwnsCollection(designer.id, collection.id)) ||
    collection.admin_token === (body?.admin_token ?? "");
  if (!allowed) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const status = body?.status;
  if (status !== "published" && status !== "closed" && status !== "draft") {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  db.prepare("UPDATE collections SET status = ? WHERE id = ?").run(status, id);
  return NextResponse.json({ ok: true, status });
}
