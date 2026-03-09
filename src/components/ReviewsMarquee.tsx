import { useEffect, useMemo, useRef } from "react";

type Review = {
  name: string;
  role?: string;
  rating: number;
  text: string;
};

const REVIEWS: Review[] = [
  {
    name: "Ethan J.",
    role: "Rapid - 1580",
    rating: 5,
    text: "The puzzles actually relate to my games. It feels like the platform knows what I struggle with.",
  },
  {
    name: "Sofia L.",
    role: "Club Player",
    rating: 5,
    text: "Everything feels intentional. No wasted time, no clutter--just focused training.",
  },
  {
    name: "Daniel K.",
    role: "Weekend Tournament Player",
    rating: 4,
    text: "The structure is what impressed me most. I finally know what to work on each day.",
  },
  {
    name: "Ryan T.",
    role: "Blitz - 1800",
    rating: 5,
    text: "The opening drills exposed holes in my openings I didn't even realize were there.",
  },
  {
    name: "Priya S.",
    role: "Student Player",
    rating: 5,
    text: "I like that progress is tracked. Seeing XP makes me want to keep going.",
  },
  {
    name: "Marco D.",
    role: "Online Grinder",
    rating: 4,
    text: "It feels more serious than other platforms. Less noise, more improvement.",
  },
  {
    name: "Alex W.",
    role: "Coach - 2000+",
    rating: 5,
    text: "This encourages the right habits. Consistency, feedback, and accountability.",
  },
  {
    name: "Leah B.",
    role: "High School Team Player",
    rating: 5,
    text: "Group training makes a big difference. It feels like you're part of something.",
  },
  {
    name: "Tomas P.",
    role: "Rapid & Classical",
    rating: 4,
    text: "The UI alone makes training less draining. Everything is clear and smooth.",
  },
  {
    name: "Josh N.",
    role: "Returning Player",
    rating: 5,
    text: "I stopped burning out. The system tells me what to do instead of guessing.",
  },
];

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5 text-sm" aria-label={`${full} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < full ? "text-amber-300" : "text-white/30"}
          aria-hidden="true"
        >
          *
        </span>
      ))}
    </div>
  );
}

export default function ReviewsMarquee() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const reviews = useMemo(() => [...REVIEWS, ...REVIEWS], []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let x = 0;
    let last = performance.now();
    const speedPxPerSec = 45;

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      x -= speedPxPerSec * dt;

      const halfWidth = track.scrollWidth / 2;
      if (Math.abs(x) >= halfWidth) x = 0;

      track.style.transform = `translate3d(${x}px, 0, 0)`;

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="relative w-full">
      <div
        className="relative overflow-hidden py-3"
        role="region"
        aria-label="Auto-scrolling player reviews"
      >
        <div className="flex w-max items-stretch gap-3 sm:gap-4 will-change-transform" ref={trackRef}>
          {reviews.map((r, idx) => (
            <article
              className="w-[290px] sm:w-[320px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              key={`${r.name}-${idx}`}
            >
              <div className="mb-3">
                <Stars rating={r.rating} />
              </div>

              <p className="text-sm leading-relaxed text-white/85">"{r.text}"</p>

              <div className="mt-4">
                <div className="text-sm font-semibold tracking-tight">{r.name}</div>
                {r.role ? <div className="mt-1 text-xs text-white/60">{r.role}</div> : null}
              </div>
            </article>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#0b0f1c] to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#0b0f1c] to-transparent"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
