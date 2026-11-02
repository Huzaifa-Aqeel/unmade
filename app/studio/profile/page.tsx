import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio-shell";
import { currentDesigner } from "@/lib/auth";
import { getLatestDashboardToken } from "@/lib/store";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile — Unmade" };

export default async function ProfilePage() {
  const designer = await currentDesigner();
  if (!designer) redirect("/studio/login?next=/studio/profile");
  const latest = getLatestDashboardToken(designer.id);

  return (
    <div className="min-h-screen">
      <StudioHeader dashboardHref={latest ? `/dashboard/${latest}` : undefined} />
      <main className="mx-auto max-w-[720px] px-5 py-14 sm:px-8 lg:py-20">
        <p className="label-xs text-muted">Profile</p>
        <h1 className="display mt-4 text-[clamp(2.2rem,4.6vw,3.2rem)]">{designer.brand_name}</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          Your designer account. Everything public stays open to signed-out visitors.
        </p>

        <dl className="mt-10 divide-y divide-line border-y border-line text-[13px]">
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="text-muted">Brand name</dt>
            <dd className="text-right">{designer.brand_name}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-right">{designer.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt className="text-muted">Member since</dt>
            <dd className="text-right">{formatDate(designer.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/studio" className="btn btn-primary">
            My studio
          </Link>
          <Link href="/#drops" className="btn btn-ghost">
            Explore drops
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
