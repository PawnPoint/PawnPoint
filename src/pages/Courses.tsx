import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  createCourse,
  deleteCourse,
  getCourses,
  updateCourse,
  type Course,
  DEFAULT_COURSE_THUMBNAIL,
} from "../lib/mockApi";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { Search, Filter, Trash2, Plus, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { nanoid } from "../lib/nanoid";

const categories = [
  { key: "all", label: "All" },
  { key: "white_opening", label: "White Openings" },
  { key: "black_opening", label: "Black Openings" },
  { key: "beginner", label: "Beginners" },
  { key: "middlegame", label: "Middlegame" },
  { key: "endgame", label: "Endgame" },
  { key: "skills", label: "Skills" },
];

type LessonDraft = { id: string; title: string; summary: string };

type CourseDraft = {
  id?: string;
  title: string;
  description: string;
  category: Course["category"];
  difficulty: Course["difficulty"];
  thumbnailUrl: string;
  accentColor: string;
  lessons: LessonDraft[];
};

const createEmptyCourseDraft = (): CourseDraft => ({
  title: "",
  description: "",
  category: "beginner",
  difficulty: "beginner",
  thumbnailUrl: DEFAULT_COURSE_THUMBNAIL,
  accentColor: "#ec4899",
  lessons: [
    { id: nanoid(), title: "Lesson 1", summary: "Add content inside the course." },
    { id: nanoid(), title: "Lesson 2", summary: "Add content inside the course." },
  ],
});

export default function Courses() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(createEmptyCourseDraft());
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const MAX_THUMB_DATA_URL = 5_000_000;

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses", search, category],
    queryFn: () => getCourses(search, category),
  });

  const invalidateCourses = () => {
    queryClient.invalidateQueries({ queryKey: ["courses"] });
    queryClient.invalidateQueries({ queryKey: ["course"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createCourseMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      setSaveError("");
      invalidateCourses();
      closeEditor();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not save the course. Try again or clear some data and retry.";
      setSaveError(message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: updateCourse,
    onSuccess: () => {
      setSaveError("");
      invalidateCourses();
      closeEditor();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not save the course. Try again or clear some data and retry.";
      setSaveError(message);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: (_data, id) => {
      invalidateCourses();
      if (editingCourse && editingCourse.id === id) {
        closeEditor();
      }
    },
  });

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingCourse(null);
    setCourseDraft(createEmptyCourseDraft());
    setSaveError("");
    setCategoryMenuOpen(false);
    setDifficultyMenuOpen(false);
  };

  const startEditingCourse = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseDraft({
        ...course,
        lessons: course.lessons.map((lesson) => ({ ...lesson })),
      });
    } else {
      setEditingCourse(null);
      setCourseDraft(createEmptyCourseDraft());
    }
    setEditorOpen(true);
    setSaveError("");
    setCategoryMenuOpen(false);
    setDifficultyMenuOpen(false);
  };

  const handleSaveCourse = () => {
    if (!isAdmin) return;
    setSaveError("");
    setCategoryMenuOpen(false);
    setDifficultyMenuOpen(false);
    if (
      courseDraft.thumbnailUrl.startsWith("data:image/") &&
      courseDraft.thumbnailUrl.length > MAX_THUMB_DATA_URL
    ) {
      setSaveError("Thumbnail too large. Try a smaller PNG or a hosted link under ~5MB.");
      return;
    }
    const lessons =
      (courseDraft.lessons || []).length > 0
        ? courseDraft.lessons
        : [{ id: nanoid(), title: "Lesson 1", summary: "Add content inside the course." }];

    const payload: Course = {
      id: editingCourse?.id || courseDraft.id || nanoid(),
      title: courseDraft.title.trim() || "Untitled Course",
      description: courseDraft.description.trim() || "No description yet.",
      category: courseDraft.category,
      difficulty: courseDraft.difficulty,
      thumbnailUrl:
        courseDraft.thumbnailUrl.trim() || DEFAULT_COURSE_THUMBNAIL,
      accentColor: courseDraft.accentColor || "#ec4899",
      lessons,
    };

    if (editingCourse) {
      updateCourseMutation.mutate(payload);
    } else {
      createCourseMutation.mutate(payload);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete "${course.title}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteCourseMutation.mutate(course.id);
  };

  const saving = createCourseMutation.isPending || updateCourseMutation.isPending;
  const deleting = deleteCourseMutation.isPending;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">All Courses</h1>
            <p className="text-white/70 text-sm">Search, filter, and pick up where you left off.</p>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Filter className="h-4 w-4" />
            Club catalog
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-emerald-100">Admin mode active</div>
              <div className="text-xs text-emerald-50/80">
                Add, edit, delete courses, and update thumbnails directly from the catalog.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => startEditingCourse()}>
                <Plus className="h-4 w-4 mr-2" />
                Add course
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
            <input
              placeholder="Search courses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand.pink"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.key}
                variant={category === cat.key ? "primary" : "outline"}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={() => navigate(`/lesson/${course.id}`)}
              isAdmin={isAdmin}
              onDelete={handleDeleteCourse}
            />
          ))}
        </div>

        {editorOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <div className="text-lg font-semibold">
                    {editingCourse ? "Edit course" : "Add new course"}
                  </div>
                  <div className="text-xs text-white/60">Admin-only course management</div>
                </div>
                <button
                  onClick={closeEditor}
                  className="p-2 rounded-full hover:bg-white/10 text-white/70"
                  aria-label="Close editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Title</label>
                    <input
                      value={courseDraft.title}
                      onChange={(e) => setCourseDraft((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="Course title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Thumbnail URL or PNG upload</label>
                    <input
                      value={courseDraft.thumbnailUrl}
                      onChange={(e) => setCourseDraft((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="Paste a link to the cover image"
                    />
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result;
                          if (typeof result === "string") {
                            setCourseDraft((prev) => ({ ...prev, thumbnailUrl: result }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                    />
                    <div className="text-xs text-white/60">Use a link or upload a PNG to show on the card.</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Category</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCategoryMenuOpen((v) => !v)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none hover:border-white/20 flex items-center justify-between"
                      >
                        <span>
                          {categories.find((c) => c.key === courseDraft.category)?.label || "Select category"}
                        </span>
                        <span className="text-xs text-white/60">{categoryMenuOpen ? "Hide" : "Show"}</span>
                      </button>
                      {categoryMenuOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden">
                          {categories
                            .filter((c) => c.key !== "all")
                            .map((cat) => (
                              <button
                                key={cat.key}
                                onClick={() => {
                                  setCourseDraft((prev) => ({ ...prev, category: cat.key as Course["category"] }));
                                  setCategoryMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                              >
                                {cat.label}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Difficulty</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDifficultyMenuOpen((v) => !v)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none hover:border-white/20 flex items-center justify-between"
                      >
                        <span className="capitalize">{courseDraft.difficulty}</span>
                        <span className="text-xs text-white/60">{difficultyMenuOpen ? "Hide" : "Show"}</span>
                      </button>
                      {difficultyMenuOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden">
                          {["beginner", "intermediate", "advanced"].map((diff) => (
                            <button
                              key={diff}
                              onClick={() => {
                                setCourseDraft((prev) => ({ ...prev, difficulty: diff as Course["difficulty"] }));
                                setDifficultyMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 capitalize"
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80 flex items-center justify-between">
                      <span>Accent color</span>
                      <span className="text-xs text-white/60">{courseDraft.accentColor}</span>
                    </label>
                    <input
                      type="color"
                      value={courseDraft.accentColor}
                      onChange={(e) => setCourseDraft((prev) => ({ ...prev, accentColor: e.target.value }))}
                      className="h-[44px] w-full rounded-xl border border-white/10 bg-white/5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/80">Description</label>
                  <textarea
                    value={courseDraft.description}
                    onChange={(e) => setCourseDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                    rows={3}
                    placeholder="What will learners get from this course?"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {editingCourse && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteCourse(editingCourse)}
                      className={deleting ? "opacity-50 pointer-events-none" : "text-red-200 hover:text-red-100"}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete course
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" onClick={closeEditor}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCourse}
                      className={saving ? "opacity-60 pointer-events-none" : ""}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save course"}
                    </Button>
                  </div>
                </div>
                {saveError && (
                  <div className="text-sm text-red-200 bg-red-500/10 border border-red-400/40 rounded-xl px-3 py-2">
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CourseCard({
  course,
  onOpen,
  isAdmin,
  onDelete,
}: {
  course: Course;
  onOpen: () => void;
  isAdmin: boolean;
  onDelete: (course: Course) => void;
}) {
  const thumbnail = course.thumbnailUrl || DEFAULT_COURSE_THUMBNAIL;

  return (
    <Card className="relative overflow-hidden hover:border-white/20 transition border border-white/10">
      {isAdmin && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1">
          <button
            onClick={() => onDelete(course)}
            className="p-1 rounded-md hover:bg-white/10 text-red-200"
            aria-label="Delete course"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <img src={thumbnail} alt={course.title} className="h-32 w-full object-cover" />
      <CardContent className="space-y-3">
        <div className="text-sm text-brand.pink uppercase tracking-wide">
          {course.category.replace("_", " ")}
        </div>
        <div className="font-semibold">{course.title}</div>
        <p className="text-sm text-white/70 line-clamp-3">{course.description}</p>
        <Progress value={0} />
        <Button className="w-full" onClick={onOpen}>
          Start Course
        </Button>
      </CardContent>
    </Card>
  );
}
