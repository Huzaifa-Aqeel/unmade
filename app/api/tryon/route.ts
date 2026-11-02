import { getDb, now, uid, type Design } from "@/lib/db";
import { DESIGN_DIR } from "@/lib/media";
import { purgeExpiredTryOns } from "@/lib/retention";
import { createTryOnTask, uploadImage, type GarmentCategory } from "@/lib/youcam";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);
const MAX_PER_SESSION = 12;

async function referenceFileId(design: Design): Promise<string> {
  if (design.youcam_ref_file_id) return design.youcam_ref_file_id;

  const url = design.image_url;
  let buffer: Buffer;
  let fileName = "reference.jpg";

  if (url.startsWith("/api/media/designs/")) {
    fileName = path.basename(url);
    buffer = await fs.readFile(path.join(DESIGN_DIR, fileName));
  } else if (url.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    buffer = await fs.readFile(filePath);
    fileName = path.basename(filePath);
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load the design image");
    buffer = Buffer.from(await res.arrayBuffer());
    fileName = "reference.jpg";
  }

  const type = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const blob = new Blob([new Uint8Array(buffer)], { type });
  const fileId = await uploadImage(blob, fileName);

  getDb().prepare("UPDATE designs SET youcam_ref_file_id = ? WHERE id = ?").run(fileId, design.id);
  return fileId;
}

export async function POST(req: Request) {
  await purgeExpiredTryOns().catch(() => {});

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const photo = form.get("photo");
  const designId = String(form.get("design_id") ?? "");
  const sessionId = String(form.get("session_id") ?? "");
  const consent = String(form.get("consent") ?? "");

  if (consent !== "true") {
    return NextResponse.json({ error: "Please accept the photo processing consent." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Add a photo first." }, { status: 400 });
  }
  if (!ALLOWED.has(photo.type)) {
    return NextResponse.json({ error: "Please upload a JPG or PNG photo." }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep your photo under 10MB." }, { status: 400 });
  }
  if (!sessionId || sessionId.length < 8) {
    return NextResponse.json({ error: "Session expired. Refresh the page." }, { status: 400 });
  }

  const db = getDb();
  const design = db.prepare("SELECT * FROM designs WHERE id = ?").get(designId) as Design | undefined;
  if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });

  const collection = db
    .prepare("SELECT id, status, deadline FROM collections WHERE id = ?")
    .get(design.collection_id) as { id: string; status: string; deadline: string } | undefined;
  if (!collection || collection.status !== "published" || new Date(collection.deadline).getTime() < Date.now()) {
    return NextResponse.json({ error: "This drop is closed." }, { status: 403 });
  }

  const used = db
    .prepare("SELECT COUNT(*) AS n FROM tryon_tasks WHERE session_id = ? AND collection_id = ?")
    .get(sessionId, collection.id) as { n: number };
  if (used.n >= MAX_PER_SESSION) {
    return NextResponse.json(
      { error: "You've reached the try-on limit for this drop. Thanks for exploring." },
      { status: 429 },
    );
  }

  try {
    const srcFileId = await uploadImage(photo, "selfie.jpg");
    const refFileId = await referenceFileId(design);
    const taskId = await createTryOnTask({
      srcFileId,
      refFileId,
      category: design.garment_category as GarmentCategory,
    });

    const id = uid("try_");
    db.prepare(
      `INSERT INTO tryon_tasks (id, collection_id, design_id, session_id, youcam_task_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(id, collection.id, design.id, sessionId, taskId, now());

    return NextResponse.json({ id });
  } catch (err) {
    console.error("try-on create failed", err);
    return NextResponse.json(
      { error: "We couldn't start the try-on. Please try again in a moment." },
      { status: 502 },
    );
  }
}
