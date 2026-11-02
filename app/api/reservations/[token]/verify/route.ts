import { getDb, now, type Collection, type Design, type Reservation } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/email";
import { formatDate, money } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verifyToken = new URL(req.url).searchParams.get("t") ?? "";
  const db = getDb();

  const reservation = db.prepare("SELECT * FROM reservations WHERE manage_token = ?").get(token) as
    | Reservation
    | undefined;

  if (!reservation) {
    return NextResponse.redirect(appUrl(`/reservation/${token}?error=notfound`));
  }
  if (verifyToken !== reservation.verify_token) {
    return NextResponse.redirect(appUrl(`/reservation/${token}?error=invalid`));
  }

  if (!reservation.verified_at) {
    db.prepare("UPDATE reservations SET status = 'verified', verified_at = ?, updated_at = ? WHERE id = ?").run(
      now(),
      now(),
      reservation.id,
    );

    const design = db.prepare("SELECT * FROM designs WHERE id = ?").get(reservation.design_id) as Design | undefined;
    const collection = db.prepare("SELECT * FROM collections WHERE id = ?").get(reservation.collection_id) as
      | Collection
      | undefined;

    await sendMail({
      to: reservation.email,
      subject: `Reservation confirmed — ${design?.name ?? "your design"}`,
      link: appUrl(`/reservation/${token}`),
      body: [
        `Your reservation for ${design?.name ?? "a design"} is confirmed and now counts toward its production target.`,
        "",
        `Design: ${design?.name ?? "-"}`,
        `Proposed price: ${design ? money(reservation.price_cents) : "-"}`,
        `Size: ${reservation.preferred_size}`,
        `Reservations close: ${collection ? formatDate(collection.deadline) : "-"}`,
        "",
        `Manage or cancel: ${appUrl(`/reservation/${token}`)}`,
        "",
        "This design has not been manufactured. No payment has been collected and production is not guaranteed.",
      ].join("\n"),
    });
  }

  return NextResponse.redirect(appUrl(`/reservation/${token}?verified=1`));
}
