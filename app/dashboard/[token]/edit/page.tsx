import { notFound, redirect } from "next/navigation";
import { EditDropForm } from "@/components/edit-drop-form";
import { getCollectionByAdminToken } from "@/lib/store";
import { currentDesigner, designerOwnsCollection } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit drop — Unmade" };

export default async function EditDropPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = getCollectionByAdminToken(token);
  if (!data) notFound();

  // Same guard as the dashboard: signed-in designer who owns this drop.
  const designer = await currentDesigner();
  if (!designer) redirect(`/studio/login?next=/dashboard/${token}/edit`);
  if (!designerOwnsCollection(designer.id, data.collection.id)) notFound();

  // Closed drops are locked — demand has been read and decisions may exist.
  if (data.collection.status === "closed") redirect(`/dashboard/${token}`);

  return (
    <EditDropForm
      collection={{
        id: data.collection.id,
        admin_token: token,
        slug: data.collection.slug,
        title: data.collection.title,
        description: data.collection.description,
        cover_image: data.collection.cover_image,
        deadline: data.collection.deadline,
      }}
      designs={data.designs.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        image_url: d.image_url,
        price: (d.price_cents / 100).toFixed(2).replace(/\.00$/, ""),
        target_units: String(d.target_units),
        garment_category: d.garment_category,
        sizes: d.sizes,
      }))}
    />
  );
}
