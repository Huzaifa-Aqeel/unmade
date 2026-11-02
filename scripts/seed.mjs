/**
 * Seeds a demo drop so the showroom isn't empty.
 * Creates no fake reservations or try-ons — activity in the demo must be real.
 *
 *   npm run seed
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEMO_EMAIL = "studio@beyondbasics.studio";
const DEMO_PASSWORD = "unmade2026";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "unmade.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS designers (id TEXT PRIMARY KEY, email TEXT NOT NULL, brand_name TEXT NOT NULL, password_hash TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY, designer_id TEXT NOT NULL REFERENCES designers(id), slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cover_image TEXT, deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', admin_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL, price_cents INTEGER NOT NULL,
    garment_category TEXT NOT NULL DEFAULT 'auto', target_units INTEGER NOT NULL, sizes TEXT NOT NULL DEFAULT '[]',
    decision TEXT NOT NULL DEFAULT 'pending', decided_at TEXT, youcam_ref_file_id TEXT, position INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE, email TEXT NOT NULL,
    preferred_size TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', price_cents INTEGER NOT NULL,
    manage_token TEXT NOT NULL UNIQUE, verify_token TEXT NOT NULL, verified_at TEXT, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, is_sample INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS tryon_tasks (
    id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE, session_id TEXT NOT NULL,
    youcam_task_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', result_url TEXT, error TEXT,
    created_at TEXT NOT NULL, is_sample INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    design_id TEXT REFERENCES designs(id) ON DELETE CASCADE, session_id TEXT NOT NULL, type TEXT NOT NULL,
    created_at TEXT NOT NULL, is_sample INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY, to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, link TEXT,
    delivered INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
`);

const slug = "beyond-basics-drop-01";
const token = (len) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, len);
const uid = (p) => p + crypto.randomUUID().replace(/-/g, "").slice(0, 24);

const existing = db.prepare("SELECT id FROM collections WHERE slug = ?").get(slug);
if (existing) {
  db.prepare("DELETE FROM collections WHERE id = ?").run(existing.id);
  console.log("Removed the previous demo drop.");
}

const now = new Date();
const deadline = new Date(now.getTime() + 21 * 86_400_000).toISOString();

const designerId = uid("dsg_");
const collectionId = uid("col_");
const adminToken = token(24);

const designs = [
  {
    name: "Midnight Bomber",
    description: "Cropped bomber in matte technical shell. Ribbed cuffs, two-way zip, tonal lining.",
    image: "/uploads/seed/garment-1.jpg",
    price: 12000,
    category: "outer",
    target: 50,
  },
  {
    name: "Atelier Leather Jacket",
    description: "Asymmetric leather jacket with oversized lapels and a boxy shoulder line.",
    image: "/uploads/seed/garment-2.jpg",
    price: 18500,
    category: "outer",
    target: 40,
  },
  {
    name: "Field Chambray Shirt",
    description: "Rinsed chambray overshirt with a single chest pocket and a relaxed body.",
    image: "/uploads/seed/garment-3.jpg",
    price: 8500,
    category: "upper_body",
    target: 35,
  },
];

db.transaction(() => {
  db.prepare("INSERT INTO designers (id, email, brand_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    designerId,
    DEMO_EMAIL,
    "Beyond Basics",
    hashPassword(DEMO_PASSWORD),
    now.toISOString(),
  );

  db.prepare(
    `INSERT INTO collections (id, designer_id, slug, title, description, cover_image, deadline, status, admin_token, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
  ).run(
    collectionId,
    designerId,
    slug,
    "Beyond Basics — Drop 01",
    "Three outerwear concepts from a two-person studio. We can only put one into production this season — the reservations decide which.",
    "/uploads/seed/garment-1.jpg",
    deadline,
    adminToken,
    now.toISOString(),
  );

  designs.forEach((d, i) => {
    db.prepare(
      `INSERT INTO designs (id, collection_id, name, description, image_url, price_cents, garment_category, target_units, sizes, decision, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(
      uid("dsn_"),
      collectionId,
      d.name,
      d.description,
      d.image,
      d.price,
      d.category,
      d.target,
      JSON.stringify(["XS", "S", "M", "L", "XL"]),
      i,
    );
  });
})();

const base = process.env.APP_URL || "http://localhost:3000";
console.log("\nDemo drop seeded.\n");
console.log(`  Showroom:  ${base}/drop/${slug}`);
console.log(`  Studio:    ${base}/studio`);
console.log(`  Dashboard: ${base}/dashboard/${adminToken}`);
console.log(`\n  Designer login: ${DEMO_EMAIL}`);
console.log(`  Password:       ${DEMO_PASSWORD}\n`);
