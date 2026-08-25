import "server-only";

/**
 * Where automatic backups are kept: Vercel Blob, which is outside the database
 * and outside this repo.
 *
 * Written against the Blob REST API with plain fetch rather than @vercel/blob.
 * Two reasons: this project deliberately carries no vendor SDKs, and a
 * configurable base URL means the upload and listing paths can be exercised
 * end to end against a stub in tests. A backup system that has never been run
 * for real is not a backup system — that is exactly how the previous one
 * failed, silently, for weeks.
 */

const API_VERSION = "7";
const BASE = process.env.BLOB_API_BASE ?? "https://blob.vercel-storage.com";

export interface StoredBackup {
  pathname: string;
  uploadedAt: string;
  size: number;
}

export function backupStoreConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function auth(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    "x-api-version": API_VERSION,
  };
}

/** Uploads one backup. Returns the URL it can be downloaded from. */
export async function putBackup(pathname: string, json: string): Promise<string> {
  if (!backupStoreConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set, so the backup has nowhere to go.");
  }
  const res = await fetch(`${BASE}/${encodeURI(pathname)}`, {
    method: "PUT",
    headers: {
      ...auth(),
      "content-type": "application/json",
      // Dated filenames are unique already; never overwrite silently.
      "x-add-random-suffix": "0",
      "x-cache-control-max-age": "0",
    },
    body: json,
  });
  if (!res.ok) {
    throw new Error(`Blob upload failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { url?: string };
  if (!body.url) throw new Error("Blob upload returned no URL.");
  return body.url;
}

/** Every backup held, newest first. */
export async function listBackups(): Promise<StoredBackup[]> {
  if (!backupStoreConfigured()) return [];
  const res = await fetch(`${BASE}/?prefix=${encodeURIComponent("backups/")}&limit=100`, {
    headers: auth(),
  });
  if (!res.ok) {
    throw new Error(`Blob list failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as {
    blobs?: { pathname: string; uploadedAt: string; size: number }[];
  };
  return (body.blobs ?? [])
    .map((b) => ({ pathname: b.pathname, uploadedAt: b.uploadedAt, size: b.size }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** How stale the newest backup is, in hours. Null when there is none at all. */
export function hoursSince(newest: StoredBackup | undefined, now = Date.now()): number | null {
  if (!newest) return null;
  return (now - new Date(newest.uploadedAt).getTime()) / 3_600_000;
}

/**
 * A backup older than this counts as a failure, not a delay: the job runs
 * daily, so 26 hours means at least one run was missed.
 */
export const STALE_AFTER_HOURS = 26;

export function backupHealth(
  backups: StoredBackup[],
  now = Date.now(),
): { ok: boolean; detail: string } {
  if (!backupStoreConfigured()) {
    return {
      ok: false,
      detail:
        "No backup store is configured (BLOB_READ_WRITE_TOKEN missing) — nothing is being backed up.",
    };
  }
  const newest = backups[0];
  const age = hoursSince(newest, now);
  if (age === null) {
    return { ok: false, detail: "No backup has ever been taken." };
  }
  if (age > STALE_AFTER_HOURS) {
    return {
      ok: false,
      detail: `Last backup was ${Math.floor(age)} hours ago (${newest!.pathname}) — the nightly backup is not running.`,
    };
  }
  return {
    ok: true,
    detail: `${backups.length} backup(s) held, newest ${Math.floor(age)}h ago (${newest!.pathname})`,
  };
}
