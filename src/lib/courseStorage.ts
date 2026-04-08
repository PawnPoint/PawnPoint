import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { auth, storage } from "./firebase";
import { nanoid } from "./nanoid";

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

export async function uploadCourseAsset(file: File, options: UploadCourseAssetOptions): Promise<string> {
  const ownerId = sanitizePathSegment(auth.currentUser?.uid || "anonymous");
  const courseId = sanitizePathSegment(options.courseId || "draft");
  const fileName = sanitizePathSegment(file.name || `${options.kind}-${Date.now()}`);
  const pathParts = ["courses", ownerId, options.kind, courseId];
  if (options.chapterId) {
    pathParts.push(sanitizePathSegment(options.chapterId));
  }
  pathParts.push(`${Date.now()}-${nanoid()}-${fileName}`);

  const assetRef = storageRef(storage, pathParts.join("/"));
  await uploadBytes(assetRef, file, {
    contentType: file.type || undefined,
    cacheControl: "public,max-age=3600",
  });
  return getDownloadURL(assetRef);
}
