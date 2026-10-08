/**
 * Google Drive API v3 client helper.
 * Uses a Service Account for authentication (no user OAuth needed).
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  – minified JSON key string
 *   GOOGLE_DRIVE_FOLDER_ID       – root folder ID containing manifest.yaml
 */
import { google } from "googleapis";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string | null;
}

// ──────────────────────────────────────────────
// Client factory
// ──────────────────────────────────────────────

function getServiceAccountAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set. See docs/google-drive-setup.md."
    );
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Make sure you minified the key file correctly."
    );
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

export function getDriveClient() {
  const auth = getServiceAccountAuth();
  return google.drive({ version: "v3", auth });
}

export function getDriveFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "GOOGLE_DRIVE_FOLDER_ID is not set. See docs/google-drive-setup.md."
    );
  }
  return folderId;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Lists all files directly inside a Drive folder (non-recursive).
 * Returns only files (not sub-folders unless mimeType matches).
 */
export async function listFolderContents(
  drive: ReturnType<typeof getDriveClient>,
  folderId: string
): Promise<DriveFile[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, modifiedTime)",
    pageSize: 1000,
  });
  return (res.data.files ?? []) as DriveFile[];
}

/**
 * Downloads a file's text content from Drive.
 * Returns null if the file cannot be downloaded (e.g., Google Docs — must be plain text).
 */
export async function downloadFileText(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string
): Promise<string | null> {
  try {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch {
    return null;
  }
}

/**
 * Finds a file by name inside a folder.
 * Returns the first match or null.
 */
export async function findFileByName(
  drive: ReturnType<typeof getDriveClient>,
  folderId: string,
  fileName: string
): Promise<DriveFile | null> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
    fields: "files(id, name, mimeType, modifiedTime)",
    pageSize: 1,
  });
  const files = res.data.files ?? [];
  return files.length > 0 ? (files[0] as DriveFile) : null;
}

/**
 * Finds a sub-folder by name inside a parent folder.
 * Returns the folder's ID or null.
 */
export async function findSubFolderId(
  drive: ReturnType<typeof getDriveClient>,
  parentFolderId: string,
  folderName: string
): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  const folders = res.data.files ?? [];
  return folders.length > 0 ? (folders[0].id ?? null) : null;
}
