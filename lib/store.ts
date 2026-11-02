import { getDb, type Collection, type Design, type Reservation } from "./db";

export type DesignWithStats = Omit<Design, "sizes"> & {
  sizes: string[];
  reservations: number;
  pending: number;
  tryons: number;
  tryonSessions: number;
  targetReached: boolean;
  productionEligible: boolean;
};

export type CollectionBundle = {
  collection: Collection & { brand_name: string; designer_email: string };
  designs: DesignWithStats[];
};

function parseSizes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function getCollection(slug: string): CollectionBundle | null {
  const db = getDb();
  const collection = db
    .prepare(
      `SELECT c.*, d.brand_name AS brand_name, d.email AS designer_email
       FROM collections c JOIN designers d ON d.id = c.designer_id
       WHERE c.slug = ?`,
    )
    .get(slug) as (Collection & { brand_name: string; designer_email: string }) | undefined;

  if (!collection) return null;
  return { collection, designs: getDesigns(collection.id) };
}

export function getCollectionByAdminToken(adminToken: string): CollectionBundle | null {
  const db = getDb();
  const collection = db
    .prepare(
      `SELECT c.*, d.brand_name AS brand_name, d.email AS designer_email
       FROM collections c JOIN designers d ON d.id = c.designer_id
       WHERE c.admin_token = ?`,
    )
    .get(adminToken) as (Collection & { brand_name: string; designer_email: string }) | undefined;

  if (!collection) return null;
  return { collection, designs: getDesigns(collection.id) };
}

export function getDesigns(collectionId: string): DesignWithStats[] {
  const db = getDb();
  const designs = db
    .prepare(`SELECT * FROM designs WHERE collection_id = ? ORDER BY position ASC, rowid ASC`)
    .all(collectionId) as Design[];

  const reservationCounts = db
    .prepare(
      `SELECT design_id,
              SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM reservations WHERE collection_id = ? AND is_sample = 0 GROUP BY design_id`,
    )
    .all(collectionId) as { design_id: string; verified: number; pending: number }[];

  const tryonCounts = db
    .prepare(
      `SELECT design_id, COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions
       FROM tryon_tasks WHERE collection_id = ? AND status = 'success' GROUP BY design_id`,
    )
    .all(collectionId) as { design_id: string; total: number; sessions: number }[];

  const rMap = new Map(reservationCounts.map((r) => [r.design_id, r]));
  const tMap = new Map(tryonCounts.map((t) => [t.design_id, t]));

  return designs.map((d) => {
    const r = rMap.get(d.id);
    const t = tMap.get(d.id);
    const reservations = r?.verified ?? 0;
    return {
      ...d,
      sizes: parseSizes(d.sizes),
      reservations,
      pending: r?.pending ?? 0,
      tryons: t?.total ?? 0,
      tryonSessions: t?.sessions ?? 0,
      targetReached: reservations >= d.target_units,
      productionEligible: reservations >= d.target_units,
    };
  });
}

export type CollectionAnalytics = {
  uniqueVisitors: number;
  totalTryons: number;
  totalReservations: number;
  sizeBreakdown: { size: string; count: number }[];
};

export function getCollectionAnalytics(collectionId: string, designs: DesignWithStats[]): CollectionAnalytics {
  const db = getDb();

  const visitors = db
    .prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM events WHERE collection_id = ?`)
    .get(collectionId) as { n: number };

  const totalTryons = designs.reduce((sum, d) => sum + d.tryons, 0);
  const totalReservations = designs.reduce((sum, d) => sum + d.reservations, 0);

  const sizes = db
    .prepare(
      `SELECT preferred_size AS size, COUNT(*) AS count FROM reservations
       WHERE collection_id = ? AND status = 'verified' AND is_sample = 0
       GROUP BY preferred_size ORDER BY count DESC`,
    )
    .all(collectionId) as { size: string; count: number }[];

  return {
    uniqueVisitors: visitors.n,
    totalTryons,
    totalReservations,
    sizeBreakdown: sizes,
  };
}

export function getReservationByToken(manageToken: string):
  | (Reservation & { design_name: string; collection_title: string; collection_slug: string; deadline: string; collection_status: string })
  | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT r.*, dg.name AS design_name, c.title AS collection_title, c.slug AS collection_slug,
              c.deadline AS deadline, c.status AS collection_status
       FROM reservations r
       JOIN designs dg ON dg.id = r.design_id
       JOIN collections c ON c.id = r.collection_id
       WHERE r.manage_token = ?`,
    )
    .get(manageToken) as
    | (Reservation & {
        design_name: string;
        collection_title: string;
        collection_slug: string;
        deadline: string;
        collection_status: string;
      })
    | undefined;
  return row ?? null;
}

export type CollectionCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  deadline: string;
  status: string;
  brand_name: string;
  design_count: number;
  preview_images: string[];
};

export function getPublishedCollections(): CollectionCard[] {
  const db = getDb();
  const collections = db
    .prepare(
      `SELECT c.id, c.slug, c.title, c.description, c.cover_image, c.deadline, c.status,
              d.brand_name AS brand_name,
              (SELECT COUNT(*) FROM designs WHERE collection_id = c.id) AS design_count
       FROM collections c JOIN designers d ON d.id = c.designer_id
       WHERE c.status IN ('published','closed')
       ORDER BY c.created_at DESC`,
    )
    .all() as Omit<CollectionCard, "preview_images">[];

  const images = db.prepare("SELECT image_url FROM designs WHERE collection_id = ? ORDER BY position").pluck();

  return collections.map((c) => ({
    ...c,
    preview_images: images.all(c.id) as string[],
  }));
}

/** Admin token of the designer's most recent drop, for the studio nav link. */
export function getLatestDashboardToken(designerId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT admin_token FROM collections
       WHERE designer_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    )
    .get(designerId) as { admin_token: string } | undefined;
  return row?.admin_token ?? null;
}

export function countActiveReservation(collectionId: string, email: string) {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT * FROM reservations
         WHERE collection_id = ? AND lower(email) = lower(?) AND status IN ('pending','verified')`,
      )
      .get(collectionId, email) as Reservation | undefined
  ) ?? null;
}
