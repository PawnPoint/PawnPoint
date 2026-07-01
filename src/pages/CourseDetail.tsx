import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  getCourse,
  getProgressForCourse,
  updateLessonProgress,
  canEditCourse,
  isTrackableCourseSubsection,
  subsectionHasInlinePgn,
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
type StudySubsection = Extract<Subsection, { type: "study" }>;
type PgnSubsection = Extract<Subsection, { type: "pgn" }>;
type QuizSubsection = Extract<Subsection, { type: "quiz" }>;
type ChapterItems = {
  studies: StudySubsection[];
  pgns: PgnSubsection[];
  quizzes: QuizSubsection[];
  trackableIds: string[];
};

const EMPTY_CHAPTER_ITEMS: ChapterItems = {
  studies: [],
  pgns: [],
  quizzes: [],
  trackableIds: [],
};

type QuizImportDraft = {
  title?: string;
  prompt: string;
  fen: string;
  options: string[];
  correctIndex: number;
};

function normalizeQuizImportDraft(raw: any): QuizImportDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const fen = String(raw.fen || raw.FEN || raw.position || "").trim();
  const prompt = String(raw.prompt || raw.question || raw.title || "").trim();
  const options: string[] = Array.isArray(raw.options)
    ? (raw.options as unknown[]).map((option: unknown) => String(option || "").trim()).filter(Boolean)
    : ([raw.a, raw.b, raw.c, raw.d, raw.answerA, raw.answerB, raw.answerC, raw.answerD] as unknown[])
        .map((option: unknown) => String(option || "").trim())
        .filter(Boolean);
  if (!fen || !prompt || options.length < 2) return null;

  let correctIndex = Number.isFinite(Number(raw.correctIndex)) ? Number(raw.correctIndex) : 0;
  if (Number.isFinite(Number(raw.correctOption))) {
    correctIndex = Number(raw.correctOption);
  }
  if (typeof raw.correct === "string") {
    const normalizedCorrect = raw.correct.trim();
    const letterIndex = "abcd".indexOf(normalizedCorrect.toLowerCase());
    const optionIndex = options.findIndex((option) => option.toLowerCase() === normalizedCorrect.toLowerCase());
    if (letterIndex >= 0) correctIndex = letterIndex;
    if (optionIndex >= 0) correctIndex = optionIndex;
  }
  if (correctIndex >= 1 && correctIndex <= options.length && raw.correctIndex == null) {
    correctIndex -= 1;
  }

  return {
    title: String(raw.title || "").trim() || undefined,
    prompt,
    fen,
    options,
    correctIndex: Math.min(Math.max(correctIndex, 0), options.length - 1),
  };
}

function parseQuizImportDrafts(text: string): QuizImportDraft[] {
  const parsed = JSON.parse(text);
  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.quizzes)
      ? parsed.quizzes
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : [parsed];
  return candidates.map(normalizeQuizImportDraft).filter((draft): draft is QuizImportDraft => !!draft);
}

export default function CourseDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newType, setNewType] = useState<"study" | "pgn" | "quiz">("study");
  const [newTitle, setNewTitle] = useState("");
  const [newPgn, setNewPgn] = useState("");
  const [newPgnFen, setNewPgnFen] = useState("");
  const [newQuizPrompt, setNewQuizPrompt] = useState("");
  const [quizFen, setQuizFen] = useState("");
  const [quizOptions, setQuizOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [correctOption, setCorrectOption] = useState(0);
  const [importedQuizDrafts, setImportedQuizDrafts] = useState<QuizImportDraft[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [isDraggingPgn, setIsDraggingPgn] = useState(false);
  const [isDraggingQuizImport, setIsDraggingQuizImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savingContent, setSavingContent] = useState(false);

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
    const map: Record<string, ChapterItems> = {};
    orderedChapters.forEach((ch) => {
      const subs = Object.values(ch.subsections || {})
        .filter((subsection) => subsection.type !== "video")
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const studies = subs.filter((s): s is StudySubsection => s.type === "study");
      const pgns = subs.filter((s): s is PgnSubsection => s.type === "pgn");
      const quizzes = subs.filter((s): s is QuizSubsection => s.type === "quiz");
      const attachedStudyIds = new Set(
        [...pgns, ...quizzes]
          .map((subsection) => subsection.parentStudyId)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      );
      map[ch.id] = {
        studies,
        pgns,
        quizzes,
        trackableIds: subs
          .filter((subsection) => isTrackableCourseSubsection(subsection, attachedStudyIds))
          .map((subsection) => subsection.id),
      };
    });
    return map;
  }, [orderedChapters]);

  const courseSubIds = useMemo(
    () => Object.values(chapterItems).flatMap((group) => group.trackableIds),
    [chapterItems],
  );

  const completedRaw = useMemo(() => new Set(progress?.completedLessonIds || []), [progress]);
  const completed = useMemo(() => new Set(courseSubIds.filter((id) => completedRaw.has(id))), [courseSubIds, completedRaw]);

  const chapterPercentById = useMemo(() => {
    const map: Record<string, number> = {};
    orderedChapters.forEach((ch) => {
      const items = chapterItems[ch.id] || EMPTY_CHAPTER_ITEMS;
      if (!items.trackableIds.length) {
        map[ch.id] = 0;
        return;
      }
      const done = items.trackableIds.filter((subId) => completed.has(subId)).length;
      const pct = Math.min(100, Math.round((done / items.trackableIds.length) * 100));
      map[ch.id] = pct;
    });
    return map;
  }, [chapterItems, completed, orderedChapters]);

  const courseProgress = progress?.progressPercent ?? 0;
  const canManageCourse = canEditCourse(course, user);

  const chapterProgress = (ch: OrderedChapter) => chapterPercentById[ch.id] ?? 0;

  const subsectionMeta = (sub: Subsection) => {
    if (sub.type === "quiz") return { icon: HelpCircle, label: "Quiz" };
    if (sub.type === "pgn") return { icon: BookOpen, label: "PGN" };
    return { icon: BookOpen, label: "Study" };
  };

  const applyQuizImportText = (text: string) => {
    try {
      const drafts = parseQuizImportDrafts(text);
      if (!drafts.length) {
        setToast("Quiz import needs JSON with fen, prompt/question, options, and correct/correctIndex.");
        return;
      }
      const first = drafts[0];
      setImportedQuizDrafts(drafts);
      setQuizFen(first.fen);
      setNewQuizPrompt(first.prompt);
      setQuizOptions(first.options);
      setCorrectOption(first.correctIndex);
      if (!newTitle.trim() && first.title) {
        setNewTitle(first.title);
      }
      setToast(drafts.length === 1 ? "Imported quiz draft." : `Imported ${drafts.length} quiz drafts.`);
    } catch {
      setToast("Quiz import must be valid JSON.");
    }
  };

  const handleCreateSubsection = async () => {
    if (savingContent) return;
    if (!canManageCourse || !course) {
      setToast("This course is not editable from this account.");
      return;
    }
    if (!selectedChapterId) {
      setToast("Select a chapter first.");
      return;
    }
    if (newType === "pgn" && !newPgn.trim()) {
      setToast("Paste or upload a PGN before saving.");
      return;
    }
    const baseTitle = newTitle.trim() || (newType === "quiz" ? "New Quiz" : newType === "pgn" ? "New PGN" : "New Study");
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
    let payloads: Subsection[] = [];
    if (newType === "quiz") {
      const drafts =
        importedQuizDrafts.length > 0
          ? importedQuizDrafts
          : [
              {
                title: baseTitle,
                prompt: newQuizPrompt.trim() || "Sample question",
                fen: quizFen.trim(),
                options: quizOptions.map((opt) => opt.trim()).filter(Boolean),
                correctIndex: correctOption,
              },
            ];
      if (!drafts.every((draft) => draft.fen.trim())) {
        setToast("Add a FEN for every quiz.");
        return;
      }
      payloads = drafts.map((draft, idx) => {
        const options = draft.options.length < 2 ? ["Option A", "Option B"] : draft.options;
        return {
          id: "",
          type: "quiz",
          title: draft.title || (drafts.length > 1 ? `${baseTitle} ${idx + 1}` : baseTitle),
          fen: draft.fen.trim(),
          questions: [
            {
              id: "q1",
              prompt: draft.prompt.trim() || "Sample question",
              options,
              correctIndex: Math.min(Math.max(draft.correctIndex, 0), options.length - 1),
            },
          ],
          index: targetIdx + idx,
          parentStudyId: selectedStudyId || undefined,
        };
      });
    } else if (newType === "pgn") {
      payloads = [{
        id: "",
        type: "pgn",
        title: baseTitle,
        pgn:
          newPgn.trim() ||
          `[Event "New Study"]\n[Site "?"]\n[Result "*"]\n1.e4 e5 2.Nf3 Nc6 3.Bb5 *`,
        fen: newPgnFen.trim() || undefined,
        index: targetIdx,
        parentStudyId: selectedStudyId || undefined,
      }];
    } else {
      // new study container
      payloads = [{
        id: "",
        type: "study",
        title: baseTitle,
        index: studies.length,
      }];
    }
    const savedSubsections: Subsection[] = [];
    try {
      setSavingContent(true);
      for (const payload of payloads) {
        const saved = await saveSubsection(course.id, selectedChapterId, payload);
        if (saved) savedSubsections.push(saved);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not save this content.");
      return;
    } finally {
      setSavingContent(false);
    }
    if (!savedSubsections.length) {
      setToast("Could not save this content. Check that the course is editable and try again.");
      return;
    }
    queryClient.setQueriesData<Course | undefined>({ queryKey: ["course", id] }, (current) => {
      if (!current?.chapters?.[selectedChapterId]) return current;
      const chapter = current.chapters[selectedChapterId];
      const savedMap = savedSubsections.reduce<Record<string, Subsection>>((acc, subsection) => {
        acc[subsection.id] = subsection;
        return acc;
      }, {});
      return {
        ...current,
        contentUpdatedAt: Date.now(),
        chapters: {
          ...current.chapters,
          [selectedChapterId]: {
            ...chapter,
            subsections: {
              ...(chapter.subsections || {}),
              ...savedMap,
            },
          },
        },
      };
    });
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
    setToast("Added successfully");
    setOpenChapterId(selectedChapterId);
    setCreateModalOpen(false);
    setNewTitle("");
    setNewPgn("");
    setNewPgnFen("");
    setNewQuizPrompt("");
    setQuizFen("");
    setQuizOptions(["Option A", "Option B", "Option C", "Option D"]);
    setCorrectOption(0);
    setImportedQuizDrafts([]);
    setSelectedStudyId(null);
  };

  const handleDeleteSubsection = async (chapterId: string, subsectionId: string) => {
    if (!canManageCourse || !course) return;
    await deleteSubsection(course.id, chapterId, subsectionId);
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!canManageCourse || !course) return;
    await deleteChapter(course.id, chapterId);
    await queryClient.invalidateQueries({ queryKey: ["course", id] });
    await queryClient.invalidateQueries({ queryKey: ["progress", id] });
  };

  const handleCreateChapter = async () => {
    if (!canManageCourse || !course) return;
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
                    {canManageCourse && (
                      <button
                        className="ml-2 p-1 rounded-full hover:bg-white/10 text-white"
                        onClick={() => setCreateModalOpen(true)}
                        aria-label="Add subsection"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                    )}
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
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setOpenChapterId(open ? null : chapter.id)}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="text-xs text-white/60">Chapter {idx + 1}</div>
                        <div className="truncate font-semibold text-white">{chapter.title}</div>
                      </div>
                      <div className="w-40 hidden sm:flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} />
                      </div>
                      {open ? <ChevronUp className="h-4 w-4 shrink-0 text-white/70" /> : <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />}
                    </button>
                    {canManageCourse && (
                      <button
                        type="button"
                        className="p-1 rounded-full hover:bg-white/10 text-white/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(chapter.id);
                        }}
                        aria-label="Delete chapter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="border-t border-white/10 px-4 py-3 space-y-3">
                      {(() => {
                        const items = chapterItems[chapter.id] || EMPTY_CHAPTER_ITEMS;
                        const studies = items.studies;
                        const orphanPgns = items.pgns.filter((s) => !s.parentStudyId);
                        const orphanQuizzes = items.quizzes.filter((s) => !s.parentStudyId);
                        const studyGroups = studies.map((study) => ({
                              study,
                              pgns: items.pgns.filter((p) => p.parentStudyId === study.id),
                              quizzes: items.quizzes.filter((q) => q.parentStudyId === study.id),
                            }));
                        const groups =
                          orphanPgns.length || orphanQuizzes.length || !studyGroups.length
                            ? [...studyGroups, { study: null, pgns: orphanPgns, quizzes: orphanQuizzes }]
                            : studyGroups;

                        return groups.length ? (
                          groups.map((group, gIdx) => {
                            const study = group.study;
                            const pgns = group.pgns;
                            const quizzes = group.quizzes;
                            const studyHasInlinePgn = subsectionHasInlinePgn(study);
                            const studyIsTrackable = !!study && (studyHasInlinePgn || (!pgns.length && !quizzes.length));
                            const studyDone = studyIsTrackable && study ? completed.has(study.id) : false;
                            const quizzesDone = quizzes.filter((q) => completed.has(q.id)).length;
                            const pgnDone = pgns.filter((p) => completed.has(p.id)).length;
                            const totalItems = pgns.length + quizzes.length + (studyIsTrackable ? 1 : 0);
                            const doneCount = pgnDone + quizzesDone + (studyDone ? 1 : 0);
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
                                  {canManageCourse && (
                                    <button
                                      className="text-white/60 hover:text-red-300 ml-2"
                                      onClick={() => study && handleDeleteSubsection(chapter.id, study.id)}
                                      aria-label="Delete study"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-3 text-sm text-white/80">
                                  {totalItems > 0 && (
                                    <div className="text-xs text-white/50">
                                      {doneCount}/{totalItems} complete
                                    </div>
                                  )}
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {studyIsTrackable && study && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          className="flex items-center gap-3 text-left rounded-lg px-4 py-3 border border-transparent hover:border-white/20 hover:bg-white/10 transition text-base"
                                          onClick={() => navigate(`/lesson/${course.id}?sub=${study.id}`)}
                                        >
                                          <BookOpen className="h-5 w-5 text-white" />
                                          <span className="text-white">{study.title}</span>
                                        </button>
                                        {studyDone && <span className="text-xs text-emerald-300">Done</span>}
                                      </div>
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
                                          {canManageCourse && (
                                            <button
                                              className="text-white/60 hover:text-red-300"
                                              onClick={() => handleDeleteSubsection(chapter.id, pgn.id)}
                                              aria-label="Delete PGN"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                          {done && <span className="text-xs text-emerald-300">Done</span>}
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
                                          {canManageCourse && (
                                            <button
                                              className="text-white/60 hover:text-red-300"
                                              onClick={() => handleDeleteSubsection(chapter.id, quiz.id)}
                                              aria-label="Delete quiz"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                          {done && <span className="text-xs text-emerald-300">Done</span>}
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
                <div className="text-xs text-white/60">Create a study, import PGN, or add FEN-based quizzes for this course.</div>
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
                New {newType === "quiz" ? "quiz" : newType === "pgn" ? "PGN" : "study"} will be created inside the selected chapter
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
                  <input
                    type="file"
                    accept=".pgn,text/plain"
                    className="text-xs text-white/70 file:mr-3 file:rounded-lg file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      file.text().then((text) => {
                        setNewPgn(text);
                        if (!newTitle.trim()) setNewTitle(file.name.replace(/\.[^.]+$/, ""));
                      });
                    }}
                  />
                  <span>Starting FEN (optional)</span>
                  <input
                    className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                    value={newPgnFen}
                    onChange={(e) => setNewPgnFen(e.target.value)}
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  />
                </label>
              )}
              {newType === "quiz" && (
                <div className="space-y-2">
                  <label
                    className={`text-sm text-white/70 flex flex-col gap-2 rounded-lg border ${
                      isDraggingQuizImport ? "border-emerald-400 bg-[#111724]/60" : "border-white/10"
                    } p-2`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingQuizImport(true);
                    }}
                    onDragLeave={() => setIsDraggingQuizImport(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingQuizImport(false);
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      file.text().then(applyQuizImportText);
                    }}
                  >
                    <span>Import quiz JSON (drop or upload)</span>
                    <input
                      type="file"
                      accept=".json,application/json,text/plain"
                      className="text-xs text-white/70 file:mr-3 file:rounded-lg file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) return;
                        file.text().then(applyQuizImportText);
                      }}
                    />
                    <div className="text-xs text-white/45">
                      Format: {"[{\"title\":\"Fork tactic\",\"fen\":\"...\",\"prompt\":\"Best move?\",\"options\":[\"Nxf7\",\"Bc4\"],\"correct\":0}]"}
                    </div>
                    {importedQuizDrafts.length > 0 && (
                      <div className="text-xs text-emerald-300">{importedQuizDrafts.length} quiz draft(s) ready to save.</div>
                    )}
                  </label>
                  <label className="text-sm text-white/70 flex flex-col gap-1">
                    Question prompt
                    <input
                      className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      value={newQuizPrompt}
                      onChange={(e) => {
                        setNewQuizPrompt(e.target.value);
                        setImportedQuizDrafts([]);
                      }}
                      placeholder="Enter a question"
                    />
                  </label>
                  <label className="text-sm text-white/70 flex flex-col gap-1">
                    FEN (required)
                    <input
                      className="bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      value={quizFen}
                      onChange={(e) => {
                        setQuizFen(e.target.value);
                        setImportedQuizDrafts([]);
                      }}
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
                            onChange={() => {
                              setCorrectOption(idx);
                              setImportedQuizDrafts([]);
                            }}
                          />
                          <input
                            className="flex-1 bg-[#111724] border border-white/10 rounded-lg px-3 py-2 text-sm"
                            value={opt}
                            onChange={(e) => {
                              const next = [...quizOptions];
                              next[idx] = e.target.value;
                              setQuizOptions(next);
                              setImportedQuizDrafts([]);
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                          {quizOptions.length > 2 && (
                            <button
                              className="text-white/60 hover:text-red-300 text-xs"
                              onClick={() => {
                                const next = quizOptions.filter((_, i) => i !== idx);
                                setQuizOptions(next);
                                setImportedQuizDrafts([]);
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
                        onClick={() => {
                          setQuizOptions((prev) => [...prev, ""]);
                          setImportedQuizDrafts([]);
                        }}
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
              <Button onClick={handleCreateSubsection} disabled={!selectedChapterId || savingContent}>
                {savingContent ? "Saving..." : "Save to Chapter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}


