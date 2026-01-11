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
    <div className="pp-stars" aria-label={`${full} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "pp-star on" : "pp-star"}>
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
    <section className="pp-reviews">
      <div className="pp-marquee" role="region" aria-label="Auto-scrolling player reviews">
        <div className="pp-track" ref={trackRef}>
          {reviews.map((r, idx) => (
            <article className="pp-card" key={`${r.name}-${idx}`}>
              <div className="pp-card-top">
                <Stars rating={r.rating} />
              </div>

              <p className="pp-card-text">"{r.text}"</p>

              <div className="pp-card-foot">
                <div className="pp-card-name">{r.name}</div>
                {r.role ? <div className="pp-card-role">{r.role}</div> : null}
              </div>
            </article>
          ))}
        </div>

        <div className="pp-fade left" aria-hidden="true" />
        <div className="pp-fade right" aria-hidden="true" />
      </div>
    </section>
  );
}
