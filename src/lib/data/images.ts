import "server-only";
import { putBlob, sortableTimestamp, randomSuffix } from "@/lib/data/blobClient";

/**
 * Product photo storage.
 *
 * Photos used to be embedded as base64 `data:` URLs directly inside the
 * product row — simple, but it meant every photo's bytes lived in the
 * database (and, before that, every audit entry) rather than as a real,
 * CDN-served file. Photos now go to Blob as their own objects, one per photo,
 * under `store/images/`, and the catalogue stores just the resulting URL —
 * the actual lightweight-database win from the Blob migration.
 *
 * Never overwritten: every upload gets a fresh, unique pathname, so removing
 * a photo from a product (which only ever changes what the catalogue points
 * at, see catalogue.ts) never touches the file itself.
 */

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function extensionFor(contentType: string): string {
  return EXT_BY_TYPE[contentType.toLowerCase()] ?? "jpg";
}

/** Uploads raw image bytes (from the admin's file picker) and returns the public URL. */
export async function uploadImageBytes(bytes: Buffer, contentType: string, hint: string): Promise<string> {
  const safeHint = hint.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "") || "product";
  const pathname = `store/images/${safeHint}/${sortableTimestamp()}-${randomSuffix()}.${extensionFor(contentType)}`;
  const { url } = await putBlob(pathname, bytes, { contentType });
  return url;
}

/** Decodes a `data:` URL and uploads it the same way — used by restoreFromBackup for legacy photos. */
export async function uploadDataUrlImage(dataUrl: string, hint: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(5, comma);
  if (comma === -1 || !header.endsWith(";base64")) {
    throw new Error("Not a base64 data URL.");
  }
  const contentType = header.slice(0, -";base64".length) || "image/jpeg";
  const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
  return uploadImageBytes(bytes, contentType, hint);
}
