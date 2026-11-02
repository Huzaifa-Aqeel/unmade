import { getDb, type Collection, type Design } from "@/lib/db";
import { currentDesigner, designerOwnsCollection } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DesignInput = {
  id?: string;
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
  cover_image?: string | null;
  deadline?: string;
  designs?: DesignInput[];
};

const CATEGORIES = new Set(["upper_body", "lower_body", "full_body", "outer", "shoes", "auto"]);

function priceToCents(v: string | number | undefined): number {
  if (typeof v === "number") return Math.round(v * 100);
  if (!v) return 0;
  const n = Number.parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Edit an existing drop. Session + ownership only — the private dashboard link
 * is not accepted as a credential here. Closed drops are locked, since demand
 * has already been read and production decisions may have been made.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const designer = await currentDesigner();
  if (!designer) {
    return NextResponse.json({ error: "Sign in to edit a drop." }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const collection = db.prepare("SELECT * FROM collections WHERE id = ?").get(id) as Collection | undefined;

  // Same 404 for "missing" and "someone else's", so ids leak nothing.
  if (!collection || !designerOwnsCollection(designer.id, collection.id)) {
    return NextResponse.json({ error: "Drop not found." }, { status: 404 });
  }
  if (collection.status === "closed") {
    return NextResponse.json({ error: "Closed drops can't be edited." }, { status: 409 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const title = (body.title ?? "").trim();
  const deadline = body.deadline ?? "";
  const designs = body.designs ?? [];

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

  const existing = db
    .prepare("SELECT * FROM designs WHERE collection_id = ? ORDER BY position ASC, rowid ASC")
    .all(collection.id) as Design[];
  const byId = new Map(existing.map((d) => [d.id, d]));

  // The edit form can change designs but not add or remove them.
  if (designs.length !== existing.length) {
    return NextResponse.json(
      { error: "Designs can't be added or removed after a drop is created." },
      { status: 400 },
    );
  }
  const seen = new Set<string>();
  for (const d of designs) {
    if (!d.id || !byId.has(d.id) || seen.has(d.id)) {
      return NextResponse.json({ error: "Unknown design for this drop." }, { status: 400 });
    }
    seen.add(d.id);
  }

  for (const [i, d] of designs.entries()) {
    const cents = priceToCents(d.price);
    const target = Math.round(Number(d.target_units ?? 0));
    if (!(d.name ?? "").trim()) {
      return NextResponse.json({ error: `Design ${i + 1}: add a name.` }, { status: 400 });
    }
    if (!d.image_url) {
      return NextResponse.json({ error: `Design ${i + 1}: add an image.` }, { status: 400 });
    }
    if (!cents || cents <= 0) {
      return NextResponse.json({ error: `Design ${i + 1}: add a price.` }, { status: 400 });
    }
    if (!Number.isFinite(target) || target < 1) {
      return NextResponse.json({ error: `Design ${i + 1}: set a reservation target.` }, { status: 400 });
    }
    if (!Array.isArray(d.sizes) || d.sizes.length === 0) {
      return NextResponse.json({ error: `Design ${i + 1}: pick at least one size.` }, { status: 400 });
    }
    if (d.garment_category && !CATEGORIES.has(d.garment_category)) {
      return NextResponse.json({ error: `Design ${i + 1}: unknown garment type.` }, { status: 400 });
    }
  }

  const coverImage =
    body.cover_image === null ? null : body.cover_image || designs[0]?.image_url || collection.cover_image;

  const tx = db.transaction(() => {
    db.prepare("UPDATE collections SET title = ?, description = ?, cover_image = ?, deadline = ? WHERE id = ?").run(
      title,
      (body.description ?? "").trim(),
      coverImage,
      new Date(deadline).toISOString(),
      collection.id,
    );

    designs.forEach((d, index) => {
      const previous = byId.get(d.id as string) as Design;
      // A replaced garment image must be re-uploaded to YouCam on the next try-on.
      const refFileId = previous.image_url === d.image_url ? previous.youcam_ref_file_id : null;
      db.prepare(
        `UPDATE designs
           SET name = ?, description = ?, image_url = ?, price_cents = ?, garment_category = ?,
               target_units = ?, sizes = ?, position = ?, youcam_ref_file_id = ?
         WHERE id = ?`,
      ).run(
        (d.name ?? "").trim(),
        (d.description ?? "").trim(),
        d.image_url as string,
        priceToCents(d.price),
        CATEGORIES.has(d.garment_category ?? "") ? (d.garment_category as string) : "auto",
        Math.round(Number(d.target_units)),
        JSON.stringify((d.sizes ?? []).map(String)),
        index,
        refFileId,
        previous.id,
      );
    });
  });

  try {
    tx();
  } catch (err) {
    return NextResponse.json({ error: "Could not save the changes.", detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: collection.slug, admin_token: collection.admin_token });
}
