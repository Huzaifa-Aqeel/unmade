import path from "node:path";

/**
 * User-uploaded media lives outside `public/` so it is served by route
 * handlers: files appear immediately, and customer previews are never
 * publicly enumerable.
 */
export const MEDIA_DIR = path.join(process.cwd(), "data", "media");
export const DESIGN_DIR = path.join(MEDIA_DIR, "designs");
export const TRYON_DIR = path.join(MEDIA_DIR, "tryon");

export function designUrl(fileName: string): string {
  return `/api/media/designs/${fileName}`;
}

export function tryonUrl(taskId: string, sessionId: string): string {
  return `/api/tryon/${taskId}/image?session_id=${encodeURIComponent(sessionId)}`;
}

export const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}
