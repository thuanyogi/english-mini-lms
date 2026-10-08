import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceSegments, sources } from "@/db/schema";
import type { FieldError, ReviewState } from "@/lib/content-constants";
import {
  validateSegmentFields,
  validateSourceFields,
  type SegmentFields,
  type SourceFields,
} from "@/lib/content-source-validation";
import { ContentError } from "./content-errors";

export type AdminContentSource = typeof sources.$inferSelect;
export type AdminContentSegment = typeof sourceSegments.$inferSelect;

function fail(errors: FieldError[]): never {
  throw new ContentError(422, "Dữ liệu không hợp lệ", errors);
}

// ── sources ──────────────────────────────────────────

export async function listContentSources(state: string | null): Promise<AdminContentSource[]> {
  const q = db.select().from(sources);
  return state && state !== "all"
    ? q.where(eq(sources.reviewState, state as ReviewState)).orderBy(desc(sources.updatedAt))
    : q.orderBy(desc(sources.updatedAt));
}

export async function createContentSource(raw: unknown): Promise<AdminContentSource> {
  const v = validateSourceFields(raw, "create");
  if (!v.ok) fail(v.errors);
  const f = v.value as Partial<SourceFields> & Pick<SourceFields, "id" | "title" | "kind">;
  const [dup] = await db.select({ id: sources.id }).from(sources).where(eq(sources.id, f.id)).limit(1);
  if (dup) throw new ContentError(409, `Nguồn "${f.id}" đã tồn tại`, [{ field: "id", message: "đã tồn tại" }]);
  const [row] = await db.insert(sources).values({ ...f, reviewState: "draft" }).returning();
  return row;
}

export async function updateContentSource(id: string, raw: unknown): Promise<AdminContentSource> {
  const [current] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!current) throw new ContentError(404, `Không tìm thấy nguồn "${id}"`);
  const v = validateSourceFields(raw, "patch", {
    kind: current.kind as SourceFields["kind"],
    url: current.url,
  });
  if (!v.ok) fail(v.errors);
  const [row] = await db.update(sources).set(v.value).where(eq(sources.id, id)).returning();
  return row;
}

// ── source_segments (không có reviewState; không bao giờ xoá) ──

export async function listContentSegments(): Promise<AdminContentSegment[]> {
  return db.select().from(sourceSegments).orderBy(desc(sourceSegments.updatedAt));
}

export async function createContentSegment(raw: unknown): Promise<AdminContentSegment> {
  const v = validateSegmentFields(raw, "create");
  if (!v.ok) fail(v.errors);
  const f = v.value as Partial<SegmentFields> & Pick<SegmentFields, "id" | "sourceId">;
  const [dup] = await db
    .select({ id: sourceSegments.id })
    .from(sourceSegments)
    .where(eq(sourceSegments.id, f.id))
    .limit(1);
  if (dup) throw new ContentError(409, `Segment "${f.id}" đã tồn tại`, [{ field: "id", message: "đã tồn tại" }]);
  const [src] = await db.select({ id: sources.id }).from(sources).where(eq(sources.id, f.sourceId)).limit(1);
  if (!src) fail([{ field: "sourceId", message: `nguồn "${f.sourceId}" không tồn tại` }]);
  const [row] = await db.insert(sourceSegments).values(f).returning();
  return row;
}

export async function updateContentSegment(id: string, raw: unknown): Promise<AdminContentSegment> {
  const [current] = await db.select().from(sourceSegments).where(eq(sourceSegments.id, id)).limit(1);
  if (!current) throw new ContentError(404, `Không tìm thấy segment "${id}"`);
  const v = validateSegmentFields(raw, "patch", {
    startSeconds: current.startSeconds,
    endSeconds: current.endSeconds,
  });
  if (!v.ok) fail(v.errors);
  const [row] = await db.update(sourceSegments).set(v.value).where(eq(sourceSegments.id, id)).returning();
  return row;
}
