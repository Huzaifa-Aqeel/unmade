import { getDb } from "./db";
import { TRYON_DIR } from "./media";
import fs from "node:fs/promises";
import path from "node:path";

const RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Temporary try-on previews are deleted after 24 hours (FR-10).
 * Called lazily on try-on requests so no background worker is required.
 */
export async function purgeExpiredTryOns(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT id FROM tryon_tasks
       WHERE created_at < ? AND result_url IS NOT NULL`,
    )
    .all(cutoff) as { id: string }[];

  for (const row of rows) {
    await fs.unlink(path.join(TRYON_DIR, `${row.id}.jpg`)).catch(() => {});
    db.prepare(`UPDATE tryon_tasks SET result_url = NULL, status = 'expired' WHERE id = ?`).run(row.id);
  }
}
