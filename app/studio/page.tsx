import Link from "next/link";
import { redirect } from "next/navigation";
import { currentDesigner } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { StudioHeader } from "@/components/studio-shell";
import { daysLeft, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your studio — Unmade" };

type Row = {
  id: string;
  slug: string;
  title: string;
  status: string;
  deadline: string;
  admin_token: string;
  cover_image: string | null;
  design_count: number;
  verified: number;
  tryons: number;
};

export default async function StudioPage() {
  const designer = await currentDesigner();
  if (!designer) redirect("/studio/login?next=/studio");

  const rows = getDb()
    .prepare(
      `SELECT c.id, c.slug, c.title, c.status, c.deadline, c.admin_token, c.cover_image,
              (SELECT COUNT(*) FROM designs WHERE collection_id = c.id) AS design_count,
              (SELECT COUNT(*) FROM reservations WHERE collection_id = c.id AND status = 'verified' AND is_sample = 0) AS verified,
              (SELECT COUNT(*) FROM tryon_tasks WHERE collection_id = c.id AND status = 'success') AS tryons
       FROM collections c
       WHERE c.designer_id = ?
       ORDER BY c.created_at DESC`,
    )
    .all(designer.id) as Row[];

  const live = rows.filter((r) => r.status === "published").length;
  const totalReservations = rows.reduce((s, r) => s + r.verified, 0);

  return (
    <div className="min-h-screen">
      <StudioHeader dashboardHref={rows[0] ? `/dashboard/${rows[0].admin_token}` : undefined} />

      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-xs text-muted">Your studio</p>
            <h1 className="display mt-3 text-[clamp(2.2rem,4.6vw,3.4rem)]">{designer.brand_name}</h1>
            <p className="mt-2 text-[12px] text-muted">
              {live} live {live === 1 ? "drop" : "drops"} · {totalReservations} verified{" "}
              {totalReservations === 1 ? "reservation" : "reservations"}
            </p>
          </div>
          <Link href="/create" className="btn btn-primary">
            New drop
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-12 border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="display text-3xl">No drops yet.</p>
            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
              Put up to three concepts in front of real customers and let reservations tell you which one to make.
            </p>
            <Link href="/create" className="btn btn-primary mt-7">
              Create your first drop
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => {
              const left = daysLeft(c.deadline);
              return (
                <div key={c.id} className="group">
                  <Link href={`/dashboard/${c.admin_token}`} className="block">
                    <div className="relative aspect-4/5 overflow-hidden bg-paper-soft">
                      {c.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.cover_image}
                          alt={c.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-end p-5 font-display text-2xl text-muted">Draft</div>
                      )}
                      <span className="absolute left-3 top-3 border border-black/10 bg-paper/90 px-2 py-1 text-[9px] label-xs">
                        {c.status === "draft"
                          ? "Draft"
                          : c.status === "closed"
                            ? "Closed"
                            : left > 0
                              ? `${left} days left`
                              : "Closing today"}
                      </span>
                    </div>
                  </Link>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard/${c.admin_token}`} className="font-display text-2xl leading-tight hover:text-rust">
                        {c.title}
                      </Link>
                      <p className="mt-1 text-[11.5px] text-muted">
                        {c.design_count} {c.design_count === 1 ? "design" : "designs"} · {c.verified} reserved ·{" "}
                        {c.tryons} try-ons
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">Closes {formatDate(c.deadline)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-[11px]">
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
