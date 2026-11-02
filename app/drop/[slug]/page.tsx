import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection } from "@/lib/store";
import { Showroom } from "@/components/showroom";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = getCollection(slug);
  if (!data) return { title: "Drop not found — Unmade" };
  return {
    title: `${data.collection.title} — ${data.collection.brand_name}`,
    description: data.collection.description || "Try unmanufactured designs on and reserve the one you want made.",
  };
}

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getCollection(slug);
  if (!data || data.collection.status === "draft") notFound();

  const { id, slug: dropSlug, title, description, cover_image, deadline, status, brand_name } = data.collection;

  return (
    <Showroom
      collection={{ id, slug: dropSlug, title, description, cover_image, deadline, status, brand_name }}
      designs={data.designs}
    />
  );
}
