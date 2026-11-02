import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, now, token, uid, type Designer } from "./db";

const COOKIE = "unmade_studio";
const SESSION_DAYS = 30;

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** Creates a designer account. Returns null when the email already exists. */
export function createDesigner(email: string, brandName: string, password: string): Designer | null {
  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM designers WHERE lower(email) = lower(?)").get(email);
  if (exists) return null;

  const id = uid("dsg_");
  db.prepare(
    "INSERT INTO designers (id, email, brand_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, normaliseEmail(email), brandName.trim(), hashPassword(password), now());

  return db.prepare("SELECT * FROM designers WHERE id = ?").get(id) as Designer;
}

export function authenticate(email: string, password: string): Designer | null {
  const db = getDb();
  const designer = db
    .prepare("SELECT * FROM designers WHERE lower(email) = lower(?)")
    .get(normaliseEmail(email)) as Designer | undefined;
  if (!designer || !verifyPassword(password, designer.password_hash)) return null;
  return designer;
}

/** Creates a server-side session and stores only its hash. */
export function createSession(designerId: string): { token: string; expiresAt: Date } {
  const raw = token(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  getDb()
    .prepare("INSERT INTO sessions (id, designer_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(uid("ses_"), designerId, digest(raw), expiresAt.toISOString(), now());
  return { token: raw, expiresAt };
}

export async function setSessionCookie(raw: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(raw));
  }
  jar.delete(COOKIE);
}

export async function currentDesigner(): Promise<Designer | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const row = getDb()
    .prepare(
      `SELECT d.* FROM sessions s JOIN designers d ON d.id = s.designer_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(digest(raw), now()) as Designer | undefined;

  return row ?? null;
}

/* ---------- ownership checks (backend-enforced isolation) ---------- */

export function designerOwnsCollection(designerId: string, collectionId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM collections WHERE id = ? AND designer_id = ?")
    .get(collectionId, designerId);
  return Boolean(row);
}

export function designerOwnsDesign(designerId: string, designId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM designs d JOIN collections c ON c.id = d.collection_id
       WHERE d.id = ? AND c.designer_id = ?`,
    )
    .get(designId, designerId);
  return Boolean(row);
}
