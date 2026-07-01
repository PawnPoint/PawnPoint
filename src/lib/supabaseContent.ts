import type { Course, UserProfile } from "./mockApi";
import { nanoid } from "./nanoid";
import { supabase } from "./supabaseClient";

type CourseContentRow = {
  course_id: string;
  payload: Course;
};

export type CourseContentRecord = Record<string, Course>;

const COURSE_TABLE = "course_content";
const COURSE_BUCKET = "course-content";
const PROFILE_BUCKET = "profile-pictures";

function sanitizePathSegment(value?: string | null) {
  const cleaned = (value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || nanoid();
}

export function getCourseContentScope(user?: UserProfile | null, isShared = false) {
  if (isShared) return "shared";
  if (user?.groupId) return `group-${user.groupId}`;
  if (user?.id) return `user-${user.id}`;
  return "public";
}

function logSupabaseWarning(action: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "Unknown Supabase error");
  console.warn(`[supabase:${action}] ${message}`);
}

export async function fetchSupabaseCourseRecord(
  user?: UserProfile | null,
  isShared = false,
): Promise<CourseContentRecord> {
  const scopeKey = getCourseContentScope(user, isShared);
  const { data, error } = await supabase
    .from(COURSE_TABLE)
    .select("course_id,payload")
    .eq("scope_key", scopeKey);

  if (error) {
    logSupabaseWarning("fetch-courses", error);
    return {};
  }

  return ((data || []) as CourseContentRow[]).reduce<CourseContentRecord>((acc, row) => {
    if (row.course_id && row.payload) {
      acc[row.course_id] = row.payload;
    }
    return acc;
  }, {});
}

export async function upsertSupabaseCourse(
  course: Course,
  user?: UserProfile | null,
  isShared = false,
): Promise<boolean> {
  const scopeKey = getCourseContentScope(user, isShared);
  const { error } = await supabase.from(COURSE_TABLE).upsert(
    {
      scope_key: scopeKey,
      course_id: course.id,
      is_shared: isShared,
      payload: course,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "scope_key,course_id" },
  );
  if (error) {
    logSupabaseWarning("upsert-course", error);
    return false;
  }
  return true;
}

export async function deleteSupabaseCourse(
  courseId: string,
  user?: UserProfile | null,
  isShared = false,
): Promise<boolean> {
  const scopeKey = getCourseContentScope(user, isShared);
  const { error } = await supabase.from(COURSE_TABLE).delete().eq("scope_key", scopeKey).eq("course_id", courseId);
  if (error) {
    logSupabaseWarning("delete-course", error);
    return false;
  }
  return true;
}

export async function uploadCourseAssetToSupabase(
  file: File,
  options: { kind: "thumbnails" | "videos"; courseId?: string; chapterId?: string; ownerId?: string | null },
): Promise<string> {
  const ownerId = sanitizePathSegment(options.ownerId || "anonymous");
  const courseId = sanitizePathSegment(options.courseId || "draft");
  const fileName = sanitizePathSegment(file.name || `${options.kind}-${Date.now()}`);
  const parts = ["courses", ownerId, options.kind, courseId];
  if (options.chapterId) parts.push(sanitizePathSegment(options.chapterId));
  parts.push(`${Date.now()}-${nanoid()}-${fileName}`);
  const path = parts.join("/");

  const { error } = await supabase.storage.from(COURSE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(COURSE_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Supabase did not return a public URL for this upload.");
  return data.publicUrl;
}

export async function uploadProfileAvatarToSupabase(userId: string, avatarValue: string): Promise<string> {
  if (!avatarValue.startsWith("data:")) return avatarValue;
  const match = avatarValue.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return avatarValue;

  const contentType = match[1] || "image/png";
  const isBase64 = !!match[2];
  const raw = isBase64 ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(raw.length);
  for (let idx = 0; idx < raw.length; idx += 1) {
    bytes[idx] = raw.charCodeAt(idx);
  }

  const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const path = `${sanitizePathSegment(userId)}/${Date.now()}-${nanoid()}.${extension}`;
  const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Supabase did not return a public URL for this profile picture.");
  return data.publicUrl;
}
