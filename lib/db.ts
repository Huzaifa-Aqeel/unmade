import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "unmade.db");

declare global {
  // eslint-disable-next-line no-var
  var __unmadeDb: Database.Database | undefined;
}

function init(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS designers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_designer_idx ON sessions (designer_id);

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      admin_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      garment_category TEXT NOT NULL DEFAULT 'auto',
      target_units INTEGER NOT NULL,
      sizes TEXT NOT NULL DEFAULT '[]',
      decision TEXT NOT NULL DEFAULT 'pending',
      decided_at TEXT,
      youcam_ref_file_id TEXT,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      preferred_size TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      price_cents INTEGER NOT NULL,
      manage_token TEXT NOT NULL UNIQUE,
      verify_token TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_unique
      ON reservations (collection_id, email)
      WHERE status IN ('pending', 'verified');

    CREATE INDEX IF NOT EXISTS reservations_design_idx ON reservations (design_id, status);

    CREATE TABLE IF NOT EXISTS tryon_tasks (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      youcam_task_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result_url TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS tryon_session_idx ON tryon_tasks (session_id);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      design_id TEXT REFERENCES designs(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS events_collection_idx ON events (collection_id, type);

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      delivered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Columns added after the first release (existing databases).
  const designerColumns = db.prepare("PRAGMA table_info(designers)").all() as { name: string }[];
  if (!designerColumns.some((c) => c.name === "password_hash")) {
    db.exec("ALTER TABLE designers ADD COLUMN password_hash TEXT");
  }

  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__unmadeDb) {
    globalThis.__unmadeDb = init();
  }
  return globalThis.__unmadeDb;
}

export type Designer = {
  id: string;
  email: string;
  brand_name: string;
  password_hash: string | null;
  created_at: string;
};

export type Collection = {
  id: string;
  designer_id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  deadline: string;
  status: "draft" | "published" | "closed";
  admin_token: string;
  created_at: string;
};

export type Design = {
  id: string;
  collection_id: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  garment_category: string;
  target_units: number;
  sizes: string;
  decision: "pending" | "production" | "declined";
  decided_at: string | null;
  youcam_ref_file_id: string | null;
  position: number;
};

export type Reservation = {
  id: string;
  collection_id: string;
  design_id: string;
  email: string;
  preferred_size: string;
  status: "pending" | "verified" | "cancelled";
  price_cents: number;
  manage_token: string;
  verify_token: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  is_sample: number;
};

export type TryonTask = {
  id: string;
  collection_id: string;
  design_id: string;
  session_id: string;
  youcam_task_id: string;
  status: string;
  result_url: string | null;
  error: string | null;
  created_at: string;
  is_sample: number;
};

export function now(): string {
  return new Date().toISOString();
}

export function uid(prefix = ""): string {
  return prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function token(len = 22): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, len);
}
