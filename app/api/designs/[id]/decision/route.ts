import { getDb, now, type Collection, type Design, type Reservation } from "@/lib/db";
import { currentDesigner, designerOwnsDesign } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Designer production decision (FR-08) + customer notifications (FR-09). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { admin_token?: string; decision?: "production" | "declined" | "pending" }
    | null;

  const db = getDb();
  const design = db.prepare("SELECT * FROM designs WHERE id = ?").get(id) as Design | undefined;
  if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });

  const collection = db
    .prepare("SELECT * FROM collections WHERE id = ?")
    .get(design.collection_id) as Collection | undefined;
  if (!collection) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const designer = await currentDesigner();
  const allowed =
    (designer && designerOwnsDesign(designer.id, design.id)) ||
    collection.admin_token === (body?.admin_token ?? "");
  if (!allowed) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const decision = body?.decision ?? "pending";
  if (!["production", "declined", "pending"].includes(decision)) {
    return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
  }
  if (collection.status !== "closed") {
    return NextResponse.json({ error: "Close the drop before making production decisions." }, { status: 409 });
  }

  db.prepare("UPDATE designs SET decision = ?, decided_at = ? WHERE id = ?").run(
    decision,
    decision === "pending" ? null : now(),
    design.id,
  );

  let notified = 0;
  if (decision !== "pending") {
    const reservations = db
      .prepare("SELECT * FROM reservations WHERE design_id = ? AND status = 'verified' AND is_sample = 0")
      .all(design.id) as Reservation[];

    for (const r of reservations) {
      await sendMail({
        to: r.email,
        subject:
          decision === "production"
            ? `${design.name} is moving to production planning`
            : `${design.name} will not be produced in this drop`,
        body:
          decision === "production"
            ? `${design.name} is moving to production planning. We'll share purchasing details when available.\n\nNo payment has been collected and no order has been created yet.`
            : `${design.name} will not be produced in this drop. Your reservation has been closed.\n\nNo payment was ever collected, so nothing further is required from you.`,
      });
      notified += 1;
    }
  }

  return NextResponse.json({ ok: true, decision, notified });
}
