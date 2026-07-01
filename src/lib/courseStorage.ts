import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { FirebaseError } from "firebase/app";
import { auth, storage } from "./firebase";
import { nanoid } from "./nanoid";
import { uploadCourseAssetToSupabase } from "./supabaseContent";

type CourseAssetKind = "thumbnails" | "videos";

type UploadCourseAssetOptions = {
  kind: CourseAssetKind;
  courseId?: string;
  chapterId?: string;
};

function sanitizePathSegment(value?: string) {
  const cleaned = (value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || nanoid();
}

function explainUploadError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    if (err.code === "storage/unauthorized") {
      return new Error("Firebase Storage denied this upload. Check Storage rules for the course upload path.");
    }
    if (err.code === "storage/canceled") {
      return new Error("Upload canceled.");
    }
    if (err.code === "storage/unknown") {
      const origin = typeof window !== "undefined" ? window.location.origin : "this site";
      return new Error(
        `Firebase Storage upload failed before the file reached the bucket. This usually means the bucket is rejecting browser CORS/preflight requests from ${origin}, the bucket name is wrong, or Storage is not fully enabled for this Firebase project.`,
      );
    }
    return new Error(err.message || "Firebase Storage upload failed.");
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error("Firebase Storage upload failed.");
}

export async function uploadCourseAsset(file: File, options: UploadCourseAssetOptions): Promise<string> {
  const ownerId = sanitizePathSegment(auth.currentUser?.uid || "anonymous");
  const courseId = sanitizePathSegment(options.courseId || "draft");
  const fileName = sanitizePathSegment(file.name || `${options.kind}-${Date.now()}`);
  const pathParts = ["courses", ownerId, options.kind, courseId];
  if (options.chapterId) {
    pathParts.push(sanitizePathSegment(options.chapterId));
  }
  pathParts.push(`${Date.now()}-${nanoid()}-${fileName}`);

  try {
    return await uploadCourseAssetToSupabase(file, {
      ...options,
      ownerId,
    });
  } catch (err) {
    console.warn("Supabase course asset upload failed; falling back to Firebase Storage.", err);
  }

  const assetRef = storageRef(storage, pathParts.join("/"));
  try {
    const metadata = {
      contentType: file.type || undefined,
      cacheControl: "public,max-age=3600",
      customMetadata: {
        originalName: file.name || fileName,
        originalSize: String(file.size || 0),
        originalLastModified: String(file.lastModified || 0),
      },
    };

    if (options.kind === "thumbnails") {
      // Read the selected PNG into bytes first so the upload uses the exact file contents
      // even if the browser's File handle behaves unexpectedly.
      const thumbnailBytes = new Uint8Array(await file.arrayBuffer());
      await uploadBytes(assetRef, thumbnailBytes, metadata);
    } else {
      await uploadBytes(assetRef, file, metadata);
    }
    return getDownloadURL(assetRef);
  } catch (err) {
    throw explainUploadError(err);
  }
}
