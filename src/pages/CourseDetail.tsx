import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  getCourse,
  getProgressForCourse,
  updateLessonProgress,
  type CourseProgress,
  type Course,
  type Chapter,
  type Subsection,
  saveSubsection,
  deleteSubsection,
  addChapter,
  deleteChapter,
} from "../lib/mockApi";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

type OrderedChapter = Chapter & { subsections: Record<string, Subsection> };

export default function CourseDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newType, setNewType] = useState<"study" | "pgn" | "quiz">("study");
  const [newTitle, setNewTitle] = useState("");
  const [newPgn, setNewPgn] = useState("");
  const [newQuizPrompt, setNewQuizPrompt] = useState("");
  const [quizFen, setQuizFen] = useState("");
  const [quizOptions, setQuizOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [correctOption, setCorrectOption] = useState(0);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [isDraggingPgn, setIsDraggingPgn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["course", id, user?.groupId, user?.accountType],
    queryFn: () => getCourse(id, user || undefined),
  });

  const { data: progress } = useQuery<CourseProgress | null>({
    queryKey: ["progress", id, user?.groupId, user?.accountType],
    enabled: !!user,
    queryFn: () => getProgressForCourse(user!.id, id),
  });

  const mutation = useMutation({
    mutationFn: (lessonId: string) => updateLessonProgress(user!.id, id, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      queryClient.invalidateQueries({ queryKey: ["progress", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

const orderedChapters: OrderedChapter[] = useMemo(() => {
    const chapters = course?.chapters
      ? Object.values(course.chapters).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      : [];
    return chapters.map((ch) => ({
      ...ch,
      subsections: ch.subsections || {},
    }));
  }, [course]);

  useEffect(() => {
    if (!selectedChapterId && orderedChapters.length) {
      setSelectedChapterId(orderedChapters[0].id);
    }
  }, [orderedChapters, selectedChapterId]);

  useEffect(() => {
    setSelectedStudyId(null);
  }, [selectedChapterId]);

  const chapterItems = useMemo(() => {
    const map: Record<string, { pgns: Subsection[]; quizzes: Subsection[] }> = {};
    orderedChapters.forEach((ch) => {
      const subs = Object.values(ch.subsections || {});
      const pgns = subs.filter((s) => s.type === "pgn");
      const quizzes = subs.filter((s) => s.type === "quiz");
      map[ch.id] = { pgns, quizzes };
    });
    return map;
  }, [orderedChapters]);

  const courseSubIds = useMemo(
    () =>
      Object.values(chapterItems)
        .flatMap((group) => [...group.pgns, ...group.quizzes])
        .map((s) => s.id),
    [chapterItems],
  );

  const completedRaw = useMemo(() => new Set(progress?.completedLessonIds || []), [progress]);
  const completed = useMemo(() => new Set(courseSubIds.filter((id) => completedRaw.has(id))), [courseSubIds, completedRaw]);

  const chapterPercentById = useMemo(() => {
    const map: Record<string, number> = {};
    orderedChapters.forEach((ch) => {
      const items = chapterItems[ch.id] || { pgns: [], quizzes: [] };
      const subs = [...items.pgns, ...items.quizzes];
      if (!subs.length) {
        map[ch.id] = 0;
        return;
      }
      const done = subs.filter((s) => completed.has(s.id)).length;
      const pct = Math.min(100, Math.round((done / subs.length) * 100));
      map[ch.id] = pct;
    });
    return map;
  }, [chapterItems, completed, orderedChapters]);

  const chapterPercents = Object.values(chapterPercentById);
  const courseProgress =
    chapterPercents.length === 0
      ? 0
      : chapterPercents.length === 1
        ? chapterPercents[0]
        : Math.round(chapterPercents.reduce((sum, pct) => sum + pct, 0) / chapterPercents.length);

  const chapterProgress = (ch: OrderedChapter) => chapterPercentById[ch.id] ?? 0;

  const subsectionMeta = (sub: Subsection) => {
    if (sub.type === "quiz") return { icon: HelpCircle, label: "Quiz" };
    if (sub.type === "pgn") return { icon: BookOpen, label: "PGN" };
    return { icon: BookOpen, label: "Study" };
  };

  const handleCreateSubsection = async () => {
    if (!selectedChapterId) {
      setToast("Select a chapter first.");
      return;
    }
    // Require a target study for PGN/Quiz attachments
    if ((newType === "pgn" || newType === "quiz") && !selectedStudyId) {
      setToast("Select a study to attach this item.");
      return;
    }
    const baseTitle = newTitle.trim() || (newType === "quiz" ? "New Quiz" : "New Study");
    const chapterSubs = orderedChapters.find((ch) => ch.id === selectedChapterId)?.subsections || {};
    const studies = Object.values(chapterSubs).filter((s) => s.type === "study");
    const orderedSubs = Object.values(chapterSubs).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const targetIdx =
      selectedStudyId && orderedSubs.length
        ? Math.min(
            orderedSubs.findIndex((s) => s.id === selectedStudyId) + 1 || orderedSubs.length,
            orderedSubs.length,
          )
        : orderedSubs.length;
    let payload: Subsection;
    if (newType === "quiz") {
      if (!quizFen.trim()) return;
      payload = {
        id: "",
        type: "quiz",
        title: baseTitle,
        fen: quizFen.trim() || undefined,
        questions: [
          {
            id: "q1",
            prompt: newQuizPrompt.trim() || "Sample question",
            options: (() => {
              const trimmed = quizOptions.map((opt) => opt.trim()).filter(Boolean);
              if (trimmed.length < 2) {
                return ["Option A", "Option B"];
              }
              return trimmed;
            })(),
            correctIndex: (() => {
              const trimmed = quizOptions.map((opt) => opt.trim()).filter(Boolean);
              const idx = Math.min(Math.max(correctOption, 0), Math.max(trimmed.length - 1, 0));
              return trimmed.length < 2 ? 0 : idx;
            })(),
            parentStudyId: selectedStudyId || undefined,
          },
        ],
        index: targetIdx,
        parentStudyId: selectedStudyId || undefined,
      };
    } else if (newType === "pgn") {
      payload = {
        id: "",
        type: "pgn",
        title: baseTitle,
        pgn:
          newPgn.trim() ||
          `[Event "New Study"]\n[Site "?"]\n[Result "*"]\n1.e4 e5 2.Nf3 Nc6 3.Bb5 *`,
        index: targetIdx,
        parentStudyId: selectedStudyId || undefined,
      };
    } else {
      // new study container
      payload = {
        id: "",
        type: "study",
        title: baseTitle,
        index: studies.length,
      };
    }
    await saveSubsection(course.id, selectedChapterId, payload);
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
    setToast("Added successfully");
    setNewTitle("");
    setNewPgn("");
    setNewQuizPrompt("");
    setQuizFen("");
    setQuizOptions(["Option A", "Option B", "Option C", "Option D"]);
    setCorrectOption(0);
    setSelectedStudyId(null);
  };

  const handleDeleteSubsection = async (chapterId: string, subsectionId: string) => {
    await deleteSubsection(course.id, chapterId, subsectionId);
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
  };

  const handleDeleteChapter = async (chapterId: string) => {
    await deleteChapter(course.id, chapterId);
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
  };

  const handleCreateChapter = async () => {
    const title = newChapterTitle.trim() || `Chapter ${orderedChapters.length + 1}`;
    const index = orderedChapters.length;
    const created = await addChapter(course.id, title, index);
    if (created) {
      await queryClient.invalidateQueries({ queryKey: ["course", id] });
      setSelectedChapterId(created.id);
      setNewChapterTitle("");
      setToast("Chapter added successfully");
    }
  };

  if (!course) {
    return (
      <AppShell backgroundStyle={pageBackground}>
        <div className="text-white/70 text-sm">Loading course...</div>
      </AppShell>
    );
  }

  return (
    <AppShell backgroundStyle={pageBackground}>
      <button
        onClick={() => navigate("/courses")}
        className="text-white/70 hover:text-white flex items-center gap-2 mb-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </button>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card className="card-solid border border-white/10">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <div className="h-24 w-24 rounded-xl overflow-hidden border border-white/10">
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">{course.title}</CardTitle>
                <p className="text-white/70 text-sm max-w-2xl">{course.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span>Your progress:</span>
                    <span className="text-white font-semibold">{courseProgress}%</span>
                    <button
                      className="ml-2 p-1 rounded-full hover:bg-white/10 text-white"
                      onClick={() => setCreateModalOpen(true)}
                      aria-label="Add subsection"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                  <Progress value={courseProgress} />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {orderedChapters.map((chapter, idx) => {
              const open = openChapterId === chapter.id;
              const pct = chapterProgress(chapter);
              return (
                <div key={chapter.id} className="rounded-xl border border-white/10 bg-[#2d3749]">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setOpenChapterId(open ? null : chapter.id)}
                  >
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="text-xs text-white/60">Chapter {idx + 1}</div>
                      <div className="font-semibold text-white">{chapter.title}</div>
                    </div>
                    <div className="w-40 hidden sm:flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                    <button
                      className="p-1 rounded-full hover:bg-white/10 text-white/70"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id);
                      }}
                      aria-label="Delete chapter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {open ? <ChevronUp className="h-4 w-4 text-white/70" /> : <ChevronDown className="h-4 w-4 text-white/70" />}
                  </button>
                  {open && (
                    <div className="border-t border-white/10 px-4 py-3 space-y-3">
                      {(() => {
                        const subs = Object.values(chapter.subsections || {}).sort(
                          (a, b) => (a.index ?? 0) - (b.index ?? 0),
                        );
                        const studies = subs.filter((s) => s.type === "study");
                        const orphanPgns = subs.filter((s) => s.type === "pgn" && !s.parentStudyId);
                        const orphanQuizzes = subs.filter((s) => s.type === "quiz" && !s.parentStudyId);
                        const groups = studies.length
                          ? studies.map((study) => ({
                              study,
                              pgns: subs.filter((p) => p.type === "pgn" && p.parentStudyId === study.id),
                              quizzes: subs.filter((q) => q.type === "quiz" && q.parentStudyId === study.id),
                            }))
                          : [{ study: null, pgns: orphanPgns, quizzes: orphanQuizzes }];

                        return groups.length ? (
                          groups.map((group, gIdx) => {
                            const study = group.study;
                            const pgns = group.pgns;
                            const quizzes = group.quizzes;
                            const studyIsGroupOnly = study?.type === "study";
                            const studyMeta = study ? subsectionMeta(study) : null;
                            const studyDone = study?.type === "pgn" ? completed.has(study.id) : false;
                            const quizzesDone = quizzes.filter((q) => completed.has(q.id)).length;
                            const pgnDone = pgns.filter((p) => completed.has(p.id)).length;
                            const totalItems = pgns.length + quizzes.length;
                            const doneCount = pgnDone + quizzesDone;
                            return (
                              <div
                                key={study?.id || `group-${gIdx}`}
                                className="rounded-lg border border-white/10 bg-[#202736] p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="text-xs text-white/60 min-w-[64px]">Study {gIdx + 1}</div>
                                    <div className="font-semibold text-white flex items-center gap-2">
                                      {study?.title || "Lesson"}
                                    </div>
                                  </div>
                                  <button
                                    className="text-white/60 hover:text-red-300 ml-2"
                                    onClick={() => study && handleDeleteSubsection(chapter.id, study.id)}
                                    aria-label="Delete study"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="space-y-3 text-sm text-white/80">
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {study?.type === "pgn" && (
                                      <button
                                        className="flex items-center gap-3 text-left rounded-lg px-4 py-3 border border-transparent hover:border-white/20 hover:bg-white/10 transition text-base"
                                        onClick={() => navigate(`/lesson/${course.id}?sub=${study.id}`)}
                                      >
                                        <BookOpen className="h-5 w-5 text-white" />
                                        <span className="text-white">{study.title}</span>
                                      </button>
                                    )}

                                    {pgns.map((pgn) => {
                                      const done = completed.has(pgn.id);
                                      return (
                                        <div key={pgn.id} className="flex items-center gap-2">
                                          <button
                                            className="flex items-center gap-3 text-left rounded-lg px-4 py-3 border border-transparent hover:border-white/20 hover:bg-white/10 transition text-base"
                                            onClick={() => navigate(`/lesson/${course.id}?sub=${pgn.id}`)}
                                          >
                                            <BookOpen className="h-5 w-5 text-white" />
                                            <span className="text-white">{pgn.title}</span>
                                          </button>
                                          <button
                                            className="text-white/60 hover:text-red-300"
                                            onClick={() => handleDeleteSubsection(chapter.id, pgn.id)}
                                            aria-label="Delete PGN"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                          {done && <span className="text-xs text-emerald-300">✓</span>}
                                        </div>
                                      );
                                    })}

                                    {quizzes.map((quiz) => {
                                      const done = completed.has(quiz.id);
                                      const meta = subsectionMeta(quiz);
                                      const Icon = meta.icon;
                                      return (
                                        <div key={quiz.id} className="flex items-center gap-2">
                                          <button
                                            className="flex items-center gap-3 text-left rounded-lg px-4 py-3 border border-transparent hover:border-white/20 hover:bg-white/10 transition text-base"
                                            onClick={() => navigate(`/lesson/${course.id}?sub=${quiz.id}`)}
                                          >
                                            <Icon className="h-5 w-5 text-white" />
                                            <span className="text-white">{quiz.title}</span>
                                          </button>
                                          <button
                                            className="text-white/60 hover:text-red-300"
                                            onClick={() => handleDeleteSubsection(chapter.id, quiz.id)}
                                            aria-label="Delete quiz"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                          {done && <span className="text-xs text-emerald-300">✓</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-white/60 text-sm">No studies added yet.</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            {orderedChapters.length === 0 && <div className="text-white/70 text-sm">No chapters available for this course.</div>}
          </CardContent>
        </Card>

        <Card className="card-solid border border-white/10 h-fit">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-[#202736] p-3 space-y-2">
              <div className="text-sm text-white/80">Play this opening against the AI</div>
              <Button className="w-full" variant="outline" onClick={() => navigate("/practice")}>
                Play vs AI
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-emerald-500 text-white rounded-lg px-4 py-2 shadow-lg border border-emerald-300/50 flex items-center gap-2">
            <span>{toast}</span>
            <button
              className="text-white/80 hover:text-white ml-2"
              onClick={() => setToast(null)}
              aria-label="Dismiss">
              X
            </button>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="pp-modal w-full max-w-lg rounded-2xl bg-[#1b2230] text-white border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Add new content</div>
                <div className="text-xs text-white/60">Create a study (PGN) or quiz for this course.</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-white/70 flex flex-col gap-1">
                Chapter
                <select
                  className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={selectedChapterId || ""}
                  onChange={(e) => setSelectedChapterId(e.target.value || null)}
                >
                  {orderedChapters.map((ch, idx) => (
                    <option key={ch.id} value={ch.id}>
                      Chapter {idx + 1}: {ch.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70 flex flex-col gap-1">
                Study (for placement)
                <select
                  className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={selectedStudyId || ""}
                  onChange={(e) => setSelectedStudyId(e.target.value || null)}
                >
                  <option value="">None</option>
                  {orderedChapters
                    .find((ch) => ch.id === selectedChapterId)
                    ?.subsections &&
                    Object.values(orderedChapters.find((ch) => ch.id === selectedChapterId)?.subsections || {})
                      .filter((s) => s.type === "study")
                      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
                      .map((sub, idx) => (
                        <option key={sub.id} value={sub.id}>
                          Study {idx + 1}: {sub.title}
                        </option>
                      ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <label className="text-sm text-white/70 flex flex-col gap-1 flex-1">
                  New chapter title
                  <input
                    className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    placeholder="Chapter title"
                  />
                </label>
                <Button variant="outline" className="shrink-0" onClick={handleCreateChapter}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add chapter
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    newType === "study" ? "border-emerald-400 text-white" : "border-white/10 text-white/70"
                  }`}
                  onClick={() => setNewType("study")}
                  type="button"
                >
                  Add Study
                </button>
                <button
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    newType === "pgn" ? "border-emerald-400 text-white" : "border-white/10 text-white/70"
                  }`}
                  onClick={() => setNewType("pgn")}
                  type="button"
                >
                  Add PGN
                </button>
                <button
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    newType === "quiz" ? "border-emerald-400 text-white" : "border-white/10 text-white/70"
                  }`}
                  onClick={() => setNewType("quiz")}
                  type="button"
                >
                  Add Quiz
                </button>
              </div>

              <div className="text-xs text-white/60">
                New {newType === "quiz" ? "quiz" : "study"} will be created inside the selected chapter
                {selectedChapterId
                  ? ` (${orderedChapters.find((ch) => ch.id === selectedChapterId)?.title || "Current"})`
                  : ""}.
              </div>

              <label className="text-sm text-white/70 flex flex-col gap-1">
                Title
                <input
                  className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter a title"
                />
              </label>

              {newType === "pgn" && (
                <label
                  className={`text-sm text-white/70 flex flex-col gap-1 rounded-lg border ${
                    isDraggingPgn ? "border-emerald-400 bg-[#111724]/60" : "border-white/10"
                  } p-2`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPgn(true);
                  }}
                  onDragLeave={() => setIsDraggingPgn(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPgn(false);
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    file.text().then((text) => setNewPgn(text));
                  }}
                >
                  <span>PGN (paste or drop a .pgn file)</span>
                  <textarea
                    className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm h-28"
                    value={newPgn}
                    onChange={(e) => setNewPgn(e.target.value)}
                    placeholder='[Event "?"] ...'
                  />
                </label>
              )}
              {newType === "quiz" && (
                <div className="space-y-2">
                  <label className="text-sm text-white/70 flex flex-col gap-1">
                    Question prompt
                    <input
                      className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      value={newQuizPrompt}
                      onChange={(e) => setNewQuizPrompt(e.target.value)}
                      placeholder="Enter a question"
                    />
                  </label>
                  <label className="text-sm text-white/70 flex flex-col gap-1">
                    FEN (required)
                    <input
                      className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      value={quizFen}
                      onChange={(e) => setQuizFen(e.target.value)}
                      placeholder="Position FEN (required)"
                    />
                  </label>
                  <label className="text-sm text-white/70 flex flex-col gap-1">
                    Choices
                    <div className="space-y-2">
                      {quizOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctOption"
                            className="h-4 w-4"
                            checked={correctOption === idx}
                            onChange={() => setCorrectOption(idx)}
                          />
                          <input
                            className="flex-1 bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                            value={opt}
                            onChange={(e) => {
                              const next = [...quizOptions];
                              next[idx] = e.target.value;
                              setQuizOptions(next);
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                          {quizOptions.length > 2 && (
                            <button
                              className="text-white/60 hover:text-red-300 text-xs"
                              onClick={() => {
                                const next = quizOptions.filter((_, i) => i !== idx);
                                setQuizOptions(next);
                                if (correctOption >= next.length) {
                                  setCorrectOption(Math.max(0, next.length - 1));
                                }
                              }}
                              type="button"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setQuizOptions((prev) => [...prev, ""])}
                        type="button"
                      >
                        Add option
                      </Button>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubsection} disabled={!selectedChapterId}>
                Save to Chapter
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}


