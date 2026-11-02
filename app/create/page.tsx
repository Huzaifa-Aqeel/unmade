import { redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio-shell";
import { CreateDropForm } from "@/components/create-drop-form";
import { currentDesigner } from "@/lib/auth";
import { getLatestDashboardToken } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a drop — Unmade" };

export default async function CreatePage() {
  const designer = await currentDesigner();
  if (!designer) redirect("/studio/login?next=/create");
  const latest = getLatestDashboardToken(designer.id);

  return (
    <div className="min-h-screen">
      <StudioHeader dashboardHref={latest ? `/dashboard/${latest}` : undefined} />
      <main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="label-xs text-muted">{designer.brand_name} · new drop</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,5.4vw,4.2rem)]">
            Put a collection
            <br />
            <span className="italic">in front of demand.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-ink-soft">
            Up to three concepts. Real customers try them on, reserve one, and show you which design is worth making.
          </p>
        </div>
        <CreateDropForm brandName={designer.brand_name} />
      </main>
    </div>
  );
}
