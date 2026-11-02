import { getDb, now, type Collection, type Design, type Reservation } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/email";
import { formatDate, money } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function load(token: string) {
  const db = getDb();
  const reservation = db.prepare("SELECT * FROM reservations WHERE manage_token = ?").get(token) as
    | Reservation
    | undefined;
  if (!reservation) return null;
  const collection = db.prepare("SELECT * FROM collections WHERE id = ?").get(reservation.collection_id) as
    | Collection
    | undefined;
  const design = db.prepare("SELECT * FROM designs WHERE id = ?").get(reservation.design_id) as Design | undefined;
  return { reservation, collection, design };
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = load(token);
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const db = getDb();
  const designs = db
    .prepare("SELECT id, name, image_url, price_cents, sizes, target_units FROM designs WHERE collection_id = ? ORDER BY position")
    .all(data.reservation.collection_id) as Pick<Design, "id" | "name" | "image_url" | "price_cents" | "sizes" | "target_units">[];

  return NextResponse.json({
    reservation: {
      id: data.reservation.id,
      status: data.reservation.status,
      email: data.reservation.email,
      preferred_size: data.reservation.preferred_size,
      price_cents: data.reservation.price_cents,
      design_id: data.reservation.design_id,
      verified_at: data.reservation.verified_at,
    },
    collection: data.collection
      ? {
          id: data.collection.id,
          title: data.collection.title,
          slug: data.collection.slug,
          deadline: data.collection.deadline,
          status: data.collection.status,
        }
      : null,
    design: data.design ? { id: data.design.id, name: data.design.name, image_url: data.design.image_url } : null,
    designs: designs.map((d) => ({ ...d, sizes: JSON.parse(d.sizes || "[]") as string[] })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await req.json().catch(() => null)) as
    | { action?: "switch" | "cancel"; design_id?: string; preferred_size?: string }
    | null;

  const data = load(token);
  if (!data?.collection || !data.design) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { reservation, collection } = data;
  if (reservation.status === "cancelled") {
    return NextResponse.json({ error: "This reservation was cancelled." }, { status: 409 });
  }

  const db = getDb();

  if (body?.action === "cancel") {
    db.prepare("UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now(), reservation.id);
    await sendMail({
      to: reservation.email,
      subject: `Reservation cancelled — ${data.design.name}`,
      body: `Your reservation for ${data.design.name} has been cancelled. You're welcome to reserve another design in ${collection.title}.`,
    });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (body?.action === "switch") {
    if (collection.status !== "published" || new Date(collection.deadline).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This drop is closed. Reservations can no longer change." }, { status: 403 });
    }

    const target = db
      .prepare("SELECT * FROM designs WHERE id = ? AND collection_id = ?")
      .get(body.design_id ?? "", collection.id) as Design | undefined;
    if (!target) return NextResponse.json({ error: "Design not found." }, { status: 404 });

    const sizes: string[] = JSON.parse(target.sizes || "[]");
    const size = body.preferred_size && sizes.includes(body.preferred_size) ? body.preferred_size : sizes[0];
    if (!size) return NextResponse.json({ error: "That design has no sizes available." }, { status: 400 });

    if (target.id === reservation.design_id) {
      db.prepare("UPDATE reservations SET preferred_size = ?, updated_at = ? WHERE id = ?").run(size, now(), reservation.id);
      return NextResponse.json({ ok: true, status: reservation.status, design_id: target.id });
    }

    db.prepare(
      "UPDATE reservations SET design_id = ?, preferred_size = ?, price_cents = ?, updated_at = ? WHERE id = ?",
    ).run(target.id, size, target.price_cents, now(), reservation.id);

    await sendMail({
      to: reservation.email,
      subject: `Reservation moved — ${target.name}`,
      link: appUrl(`/reservation/${reservation.manage_token}`),
      body: [
        `Your reservation is now for ${target.name}.`,
        "",
        `Design: ${target.name}`,
        `Proposed price: ${money(target.price_cents)}`,
        `Size: ${size}`,
        `Reservations close: ${formatDate(collection.deadline)}`,
        "",
        `Manage your reservation: ${appUrl(`/reservation/${reservation.manage_token}`)}`,
        "",
        "This design has not been manufactured. No payment has been collected and production is not guaranteed.",
      ].join("\n"),
    });

    return NextResponse.json({ ok: true, status: reservation.status, design_id: target.id });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
