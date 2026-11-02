import { notFound, redirect } from "next/navigation";
import { DropDashboard } from "@/components/drop-dashboard";
import { getCollectionAnalytics, getCollectionByAdminToken } from "@/lib/store";
import { currentDesigner, designerOwnsCollection } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drop dashboard — Unmade" };

export default async function DashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = getCollectionByAdminToken(token);
  if (!data) notFound();

  // Designer-only, and only for the designer who owns the drop.
  const designer = await currentDesigner();
  if (!designer) redirect(`/studio/login?next=/dashboard/${token}`);
  if (!designerOwnsCollection(designer.id, data.collection.id)) notFound();

  const analytics = getCollectionAnalytics(data.collection.id, data.designs);

  return <DropDashboard collection={data.collection} designs={data.designs} analytics={analytics} />;
}
