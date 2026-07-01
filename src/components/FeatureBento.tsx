import { Lock, ShieldCheck, Users } from "lucide-react";

export default function FeatureBento() {
  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="sr-only">Pawn Point features</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <article className="fade-in relative flex min-h-[310px] overflow-hidden rounded-lg border border-white/14 bg-[#050507]/82 p-6 text-white md:col-span-2">
          <div className="m-auto flex flex-col items-center text-center">
            <div className="relative flex h-28 w-60 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full text-white/10" viewBox="0 0 254 104" fill="none" aria-hidden="true">
                <ellipse cx="127" cy="52" rx="110" ry="38" stroke="currentColor" strokeWidth="7" />
                <path d="M62 79c41 18 109 18 150-2" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".5" />
                <path d="M108 21c44-10 90-4 130 17" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".45" />
              </svg>
              <span className="relative text-5xl font-semibold tracking-tight">100%</span>
            </div>
            <h3 className="mt-6 text-3xl font-semibold tracking-tight">Personalized</h3>
          </div>
        </article>

        <article className="fade-in delay-1 relative min-h-[310px] overflow-hidden rounded-lg border border-white/14 bg-[#050507]/82 p-6 text-white md:col-span-2">
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/[0.06]">
            <Lock className="relative h-16 w-16 text-white/68" strokeWidth={1.35} aria-hidden="true" />
          </div>
          <div className="relative z-10 mt-6 space-y-3 text-center">
            <h3 className="text-lg font-semibold">Secure club spaces</h3>
            <p className="mx-auto max-w-[17rem] text-sm leading-6 text-white/82">
              Private courses, members, and training plans stay organized inside each club workspace.
            </p>
          </div>
        </article>

        <article className="fade-in delay-2 relative min-h-[310px] overflow-hidden rounded-lg border border-white/14 bg-[#050507]/82 p-6 text-white md:col-span-2">
          <div className="pt-8">
            <svg className="mx-auto h-24 w-full max-w-[300px] text-white/72" viewBox="0 0 386 123" fill="none" aria-hidden="true">
              <circle cx="29" cy="29" r="14" fill="currentColor" opacity=".2" />
              <path d="M29 22v13m0 0-6-6m6 6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".72" />
              <text x="56" y="33" fill="currentColor" fontSize="13" letterSpacing="2" opacity=".62">TRAINING</text>
              <text x="302" y="33" fill="currentColor" fontSize="14" opacity=".62">4.8x</text>
              <path d="M3 104c13-30 26-36 45-36 16 0 20-20 28-20 10 0 8 33 22 33s26-17 39-14c16 4 26 18 39 18 14 0 17-30 30-30 12 0 25 35 38 32 9-2 17-24 26-24 8 0 14 23 24 22 11-1 17-16 27-16 13 0 17 16 29 16 12 0 17-8 26 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M3 104c13-30 26-36 45-36 16 0 20-20 28-20 10 0 8 33 22 33s26-17 39-14c16 4 26 18 39 18 14 0 17-30 30-30 12 0 25 35 38 32 9-2 17-24 26-24 8 0 14 23 24 22 11-1 17-16 27-16 13 0 17 16 29 16 12 0 17-8 26 18V123H3Z" fill="url(#ppFeatureSmallChart)" opacity=".38" />
              <defs>
                <linearGradient id="ppFeatureSmallChart" x1="0" y1="48" x2="0" y2="123" gradientUnits="userSpaceOnUse">
                  <stop stopColor="currentColor" stopOpacity=".44" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="relative z-10 mt-10 space-y-3 text-center">
            <h3 className="text-lg font-semibold">Progress with purpose</h3>
            <p className="mx-auto max-w-[17rem] text-sm leading-6 text-white/82">
              Track XP, ranks, puzzle work, and course progress without losing the training thread.
            </p>
          </div>
        </article>

        <article className="fade-in relative overflow-hidden rounded-lg border border-white/14 bg-[#050507]/82 p-6 text-white md:col-span-3">
          <div className="grid min-h-[255px] gap-8 sm:grid-cols-[0.78fr_1fr]">
            <div className="relative z-10 flex flex-col justify-between gap-12">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/[0.06]">
                <ShieldCheck className="h-5 w-5 text-white/80" strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Study sharper</h3>
                <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/82">
                  Build a BlackBook of openings, analysis notes, and repeatable prep for every serious game.
                </p>
              </div>
            </div>
            <div className="relative -mb-6 -mr-6 mt-10 border-l border-t border-white/12 p-6 sm:mt-12">
              <div className="absolute left-3 top-2 flex gap-1.5">
                <span className="h-2 w-2 rounded-full border border-white/14 bg-white/8" />
                <span className="h-2 w-2 rounded-full border border-white/14 bg-white/8" />
                <span className="h-2 w-2 rounded-full border border-white/14 bg-white/8" />
              </div>
              <svg className="h-full min-h-[150px] w-[135%] text-white" viewBox="0 0 366 231" fill="none" aria-hidden="true">
                <path d="M1 181l8-24 8 18 8-43 10 16 8-36 9-25 9 36 7-8 9 23 8-14 8 11 12-34 10 54 12-22 12 14 9-42 14 59 10-12 15 22 14-79 13 47 10-18 12-70 12 96 12-44 16 33 10-58 13 79 13-26 12 9 14-39 12 18 14-62 13 78 13-43 13 20 12-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".92" />
              </svg>
            </div>
          </div>
        </article>

        <article className="fade-in delay-1 relative overflow-hidden rounded-lg border border-white/14 bg-[#050507]/82 p-6 text-white md:col-span-3">
          <div className="grid min-h-[255px] gap-8 sm:grid-cols-[0.78fr_1fr]">
            <div className="relative z-10 flex flex-col justify-between gap-12">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/[0.06]">
                <Users className="h-5 w-5 text-white/80" strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Train as a team</h3>
                <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/82">
                  Coaches, admins, and students share one focused place for courses, rankings, and feedback.
                </p>
              </div>
            </div>
            <div className="relative min-h-[210px] before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-white/10">
              <div className="relative flex h-full flex-col justify-center gap-7 py-5">
                <div className="relative flex w-[calc(50%+1rem)] items-center justify-end gap-2">
                  <span className="rounded border border-white/12 bg-black px-2 py-1 text-xs shadow-sm">Coach</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#050507] bg-white text-xs font-semibold text-black">PP</span>
                </div>
                <div className="relative ml-[calc(50%-1rem)] flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#050507] bg-[#151515] text-xs font-semibold text-white">A</span>
                  <span className="rounded border border-white/12 bg-black px-2 py-1 text-xs shadow-sm">Admin</span>
                </div>
                <div className="relative flex w-[calc(50%+1rem)] items-center justify-end gap-2">
                  <span className="rounded border border-white/12 bg-black px-2 py-1 text-xs shadow-sm">Student</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#050507] bg-white/85 text-xs font-semibold text-black">S</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
