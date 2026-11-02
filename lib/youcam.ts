/**
 * Server-side YouCam (Perfect Corp AI Clothes V4) client.
 * Credentials never leave the server.
 */

const BASE = (process.env.YOUCAM_API_BASE_URL || "https://yce-api-01.makeupar.com").replace(/\/$/, "");

function apiKey(): string {
  const key = process.env.youcam_api_key || process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("YouCam API key is not configured");
  return key;
}

export type GarmentCategory = "upper_body" | "lower_body" | "full_body" | "outer" | "shoes" | "auto";

export const GARMENT_CATEGORIES: { value: GarmentCategory; label: string }[] = [
  { value: "upper_body", label: "Upper body" },
  { value: "lower_body", label: "Lower body" },
  { value: "full_body", label: "Full body" },
  { value: "outer", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "auto", label: "Auto detect" },
];

/** Uploads raw image bytes to YouCam and returns a reusable file_id. */
export async function uploadImage(file: Blob, fileName: string): Promise<string> {
  const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const size = file.size;

  const createRes = await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: fileName, file_size: size }],
    }),
  });

  const created = await createRes.json().catch(() => null);
  const entry = created?.data?.files?.[0];
  if (!createRes.ok || !entry?.file_id || !entry?.requests?.[0]?.url) {
    throw new Error(`YouCam upload init failed (${createRes.status}): ${JSON.stringify(created).slice(0, 300)}`);
  }

  const put = await fetch(entry.requests[0].url, {
    method: entry.requests[0].method || "PUT",
    headers: entry.requests[0].headers || { "Content-Type": contentType },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!put.ok) throw new Error(`YouCam upload failed (${put.status})`);

  return entry.file_id as string;
}

export async function createTryOnTask(opts: {
  srcFileId: string;
  refFileId: string;
  category: GarmentCategory;
}): Promise<string> {
  const res = await fetch(`${BASE}/s2s/v2.0/task/cloth-v4`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      src_file_id: opts.srcFileId,
      ref_file_id: opts.refFileId,
      garment_category: opts.category,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.task_id) {
    throw new Error(`YouCam task failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json.data.task_id as string;
}

export type TaskResult = {
  status: "pending" | "success" | "error";
  resultUrl?: string;
  error?: string;
  raw?: unknown;
};

export async function getTask(taskId: string): Promise<TaskResult> {
  const res = await fetch(`${BASE}/s2s/v2.0/task/cloth-v4/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return { status: "error", error: `YouCam status check failed (${res.status})`, raw: json };
  }

  const taskStatus = json?.data?.task_status as string | undefined;
  const err = json?.data?.error;
  const errorMessage =
    typeof err === "string" ? err : err?.message || err?.code || (err ? JSON.stringify(err) : undefined);

  if (taskStatus === "success" && json?.data?.results?.url) {
    return { status: "success", resultUrl: json.data.results.url, raw: json };
  }
  if (taskStatus === "error" || taskStatus === "failed" || errorMessage) {
    return { status: "error", error: errorMessage || "Try-on failed", raw: json };
  }
  return { status: "pending", raw: json };
}

const FRIENDLY: Record<string, string> = {
  error_pose: "We couldn't detect a clear standing pose. Try a full-body photo, facing the camera.",
  error_below_min_image_size: "That photo is too small. Use a larger image (at least 512px).",
  exceed_max_filesize: "That photo is too large. Keep it under 10MB.",
  error_invalid_ref: "This design reference couldn't be used. The designer needs a cleaner front-facing garment image.",
  error_apply_region_mismatch: "The design and photo don't line up. Try a different photo.",
  error_invalid_src: "The photo shows too little of you. Use a full-body or upper-body shot.",
  error_multi_person: "We found more than one person in the photo. Use a photo with only you.",
  error_nsfw_content_detected: "This image couldn't be processed.",
  error_download_image: "We couldn't read that image. Try uploading it again.",
};

export function friendlyTryOnError(raw: string | null | undefined): string {
  if (!raw) return "Something interrupted the try-on. Try again.";
  for (const key of Object.keys(FRIENDLY)) {
    if (raw.includes(key)) return FRIENDLY[key];
  }
  return "This try-on didn't come through. Try another photo or design.";
}
