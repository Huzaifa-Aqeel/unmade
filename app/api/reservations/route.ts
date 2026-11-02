import { getDb, now, token, uid, type Collection, type Design, type Reservation } from "@/lib/db";
import { sendMail, appUrl } from "@/lib/email";
import { formatDate, money } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  collection_id?: string;
  design_id?: string;
  email?: string;
  preferred_size?: string;
  terms?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (body.terms !== true) {
    return NextResponse.json({ error: "Please accept the reservation terms." }, { status: 400 });
  }
  if (!body.preferred_size) {
    return NextResponse.json({ error: "Choose your size." }, { status: 400 });
  }

  const db = getDb();
  const collection = db
    .prepare("SELECT * FROM collections WHERE id = ?")
    .get(body.collection_id ?? "") as Collection | undefined;
  if (!collection) return NextResponse.json({ error: "Drop not found." }, { status: 404 });
  if (collection.status !== "published") {
    return NextResponse.json({ error: "This drop is closed for reservations." }, { status: 403 });
  }
  if (new Date(collection.deadline).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This drop has reached its closing date." }, { status: 403 });
  }

  const design = db
    .prepare("SELECT * FROM designs WHERE id = ? AND collection_id = ?")
    .get(body.design_id ?? "", collection.id) as Design | undefined;
  if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });

  const sizes: string[] = JSON.parse(design.sizes || "[]");
  if (!sizes.includes(body.preferred_size)) {
    return NextResponse.json({ error: "That size isn't offered for this design." }, { status: 400 });
  }

  const existing = db
    .prepare(
      `SELECT * FROM reservations
       WHERE collection_id = ? AND lower(email) = ? AND status IN ('pending','verified')`,
    )
    .get(collection.id, email) as Reservation | undefined;

  if (existing) {
    const previous = db.prepare("SELECT name FROM designs WHERE id = ?").get(existing.design_id) as
      | { name: string }
      | undefined;
    return NextResponse.json(
      {
        code: "already_reserved",
        message:
          existing.design_id === design.id
            ? "You already hold a reservation for this design."
            : `You already reserved ${previous?.name ?? "another design"}. You can move your reservation here.`,
        manage_token: existing.manage_token,
        existing_design_id: existing.design_id,
        status: existing.status,
      },
      { status: 409 },
    );
  }

  // Designers reserve like anyone else, but their own reservation must not
  // inflate their collection's demand. Flag it and exclude it from counts.
  const owner = db
    .prepare(
      "SELECT d.email AS email FROM collections c JOIN designers d ON d.id = c.designer_id WHERE c.id = ?",
    )
    .get(collection.id) as { email: string } | undefined;
  const isSample = owner && owner.email.trim().toLowerCase() === email ? 1 : 0;

  const id = uid("res_");
  const manageToken = token(24);
  const verifyToken = token(24);
  const createdAt = now();

  db.prepare(
    `INSERT INTO reservations
      (id, collection_id, design_id, email, preferred_size, status, price_cents, manage_token, verify_token, created_at, updated_at, is_sample)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    collection.id,
    design.id,
    email,
    body.preferred_size,
    design.price_cents,
    manageToken,
    verifyToken,
    createdAt,
    createdAt,
    isSample,
  );

  const manageUrl = appUrl(`/reservation/${manageToken}`);
  const verifyUrl = appUrl(`/api/reservations/${manageToken}/verify?t=${verifyToken}`);

  const { delivered } = await sendMail({
    to: email,
    subject: `Confirm your reservation — ${design.name}`,
    link: verifyUrl,
    body: [
      `You're one step away from reserving ${design.name}.`,
      "",
      `Design: ${design.name}`,
      `Proposed price: ${money(design.price_cents)}`,
      `Size: ${body.preferred_size}`,
      `Reservations close: ${formatDate(collection.deadline)}`,
      "",
      `Confirm your email: ${verifyUrl}`,
      "",
      `Manage your reservation: ${manageUrl}`,
      "",
      "This design has not been manufactured. Your reservation records purchase interest at the proposed price. No payment is collected and production is not guaranteed.",
    ].join("\n"),
  });

  return NextResponse.json({
    ok: true,
    manage_token: manageToken,
    // Without an email provider configured the link is returned so the
    // verification step can still be completed in this session.
    verify_url: delivered ? null : verifyUrl,
    manage_url: manageUrl,
  });
}
