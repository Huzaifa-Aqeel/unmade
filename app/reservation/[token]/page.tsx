import { notFound } from "next/navigation";
import Link from "next/link";
import { getReservationByToken } from "@/lib/store";
import { ReservationManager } from "@/components/reservation-manager";
import { getDb, type Design } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your reservation — Unmade" };

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const reservation = getReservationByToken(token);
  if (!reservation) notFound();

  const db = getDb();
  const collection = db
    .prepare(
      `SELECT c.id, c.title, c.slug, c.deadline, c.status, c.admin_token, d.brand_name
       FROM collections c JOIN designers d ON d.id = c.designer_id WHERE c.id = ?`,
    )
    .get(reservation.collection_id) as
    | {
        id: string;
        title: string;
        slug: string;
        deadline: string;
        status: string;
        admin_token: string;
        brand_name: string;
      }
    | undefined;

  if (!collection) notFound();

  const designs = db
    .prepare("SELECT id, name, image_url, price_cents, sizes, target_units FROM designs WHERE collection_id = ? ORDER BY position")
    .all(collection.id) as Pick<Design, "id" | "name" | "image_url" | "price_cents" | "sizes" | "target_units">[];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[13px] font-medium uppercase tracking-[0.42em]">
            Unmade
          </Link>
          <Link href={`/drop/${collection.slug}`} className="text-[12px] text-muted hover:text-ink">
            View drop
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 lg:py-16">
        <ReservationManager
          token={token}
          verifiedFlash={sp.verified === "1"}
          errorFlash={sp.error ?? null}
          collection={{ id: collection.id, title: collection.title, slug: collection.slug, deadline: collection.deadline, status: collection.status, brand_name: collection.brand_name }}
          reservation={{
            id: reservation.id,
            email: reservation.email,
            status: reservation.status,
            preferred_size: reservation.preferred_size,
            price_cents: reservation.price_cents,
            design_id: reservation.design_id,
            verified_at: reservation.verified_at,
          }}
          currentDesign={{
            id: reservation.design_id,
            name: reservation.design_name,
            image_url: designs.find((d) => d.id === reservation.design_id)?.image_url ?? "",
          }}
          designs={designs.map((d) => ({ ...d, sizes: JSON.parse(d.sizes || "[]") as string[] }))}
        />
      </main>
    </div>
  );
}
