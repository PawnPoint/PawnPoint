import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  getCourse,
  getProgressForCourse,
  updateLessonProgress,
  type CourseProgress,
} from "../lib/mockApi";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function CourseDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

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

  if (!course) {
    return (
      <AppShell>
        <div className="text-white/70 text-sm">Loading course...</div>
      </AppShell>
    );
  }

  const completed = new Set(progress?.completedLessonIds || []);

  return (
    <AppShell>
      <button
        onClick={() => navigate("/courses")}
        className="text-white/70 hover:text-white flex items-center gap-2 mb-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{course.title}</CardTitle>
          <p className="text-white/70 text-sm">{course.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Progress</span>
              <span className="text-white font-semibold">
                {progress?.progressPercent ?? 0}%
              </span>
            </div>
            <Progress value={progress?.progressPercent ?? 0} />
          </div>
          <div className="space-y-3">
            {course.lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <div className="font-semibold">{lesson.title}</div>
                  <div className="text-white/70 text-sm">{lesson.summary}</div>
                </div>
                <Button
                  variant={completed.has(lesson.id) ? "outline" : "primary"}
                  onClick={() => mutation.mutate(lesson.id)}
                  disabled={mutation.isPending}
                >
                  {completed.has(lesson.id) ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </span>
                  ) : (
                    "Mark done"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
