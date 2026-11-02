import { getDb, now, token, uid } from "@/lib/db";
import { currentDesigner } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DesignInput = {
  name?: string;
  description?: string;
  image_url?: string;
  price?: string | number;
  garment_category?: string;
  target_units?: string | number;
  sizes?: string[];
};

type Body = {
  title?: string;
  description?: string;
  cover_image?: string;
  deadline?: string;
  publish?: boolean;
  designs?: DesignInput[];
};

const CATEGORIES = new Set(["upper_body", "lower_body", "full_body", "outer", "shoes", "auto"]);

function priceToCents(v: string | number | undefined): number {
  if (typeof v === "number") return Math.round(v * 100);
  if (!v) return 0;
  const n = Number.parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function uniqueSlug(base: string): string {
  const db = getDb();
  let slug = slugify(base);
  let attempt = 1;
  while (db.prepare("SELECT 1 FROM collections WHERE slug = ?").get(slug)) {
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

export async function POST(req: Request) {
  // Only signed-in designers can create collections (backend enforced).
  const designer = await currentDesigner();
  if (!designer) {
    return NextResponse.json({ error: "Sign in to create a drop." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const title = (body.title ?? "").trim();
  const deadline = body.deadline ?? "";
  const designs = (body.designs ?? []).filter((d) => (d.name ?? "").trim() && d.image_url);

  if (!title) return NextResponse.json({ error: "Give the collection a name." }, { status: 400 });
  if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
    return NextResponse.json({ error: "Set a closing date." }, { status: 400 });
  }
  if (designs.length === 0) {
    return NextResponse.json({ error: "Add at least one design." }, { status: 400 });
  }
  if (designs.length > 3) {
    return NextResponse.json({ error: "A drop can hold up to 3 designs." }, { status: 400 });
  }

  for (const [i, d] of designs.entries()) {
    const cents = priceToCents(d.price);
    const target = Math.round(Number(d.target_units ?? 0));
    if (!cents || cents <= 0) {
      return NextResponse.json({ error: `Design ${i + 1}: add a price.` }, { status: 400 });
    }
    if (!Number.isFinite(target) || target < 1) {
      return NextResponse.json({ error: `Design ${i + 1}: set a reservation target.` }, { status: 400 });
    }
    if (!Array.isArray(d.sizes) || d.sizes.length === 0) {
      return NextResponse.json({ error: `Design ${i + 1}: pick at least one size.` }, { status: 400 });
    }
  }

  const db = getDb();
  const collectionId = uid("col_");
  const slug = uniqueSlug(title);
  const adminToken = token(24);
  const status = body.publish ? "published" : "draft";
  const createdAt = now();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO collections (id, designer_id, slug, title, description, cover_image, deadline, status, admin_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      collectionId,
      designer.id,
      slug,
      title,
      (body.description ?? "").trim(),
      body.cover_image || designs[0]?.image_url || null,
      new Date(deadline).toISOString(),
      status,
      adminToken,
      createdAt,
    );

    designs.forEach((d, index) => {
      const category = CATEGORIES.has(d.garment_category ?? "") ? (d.garment_category as string) : "auto";
      db.prepare(
        `INSERT INTO designs (id, collection_id, name, description, image_url, price_cents, garment_category, target_units, sizes, decision, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      ).run(
        uid("dsn_"),
        collectionId,
        (d.name ?? "").trim(),
        (d.description ?? "").trim(),
        d.image_url as string,
        priceToCents(d.price),
        category,
        Math.round(Number(d.target_units)),
        JSON.stringify((d.sizes ?? []).map(String)),
        index,
      );
    });
  });

  try {
    tx();
  } catch (err) {
    return NextResponse.json({ error: "Could not save the collection.", detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({ slug, admin_token: adminToken, status });
}
