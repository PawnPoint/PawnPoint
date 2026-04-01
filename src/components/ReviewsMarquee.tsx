type Review = {
  name: string;
  role?: string;
  text: string;
};

const FEATURED_REVIEWS: Review[] = [
  {
    name: "Ethan J.",
    role: "Rapid - 1580",
    text: "The puzzles actually relate to my games. It feels like the platform knows what I struggle with.",
  },
  {
    name: "Sofia L.",
    role: "Club Player",
    text: "Everything feels intentional. No wasted time, no clutter, just focused training.",
  },
  {
    name: "Alex W.",
    role: "Coach - 2000+",
    text: "This encourages the right habits. Consistency, feedback, and accountability.",
  },
];

export default function ReviewsMarquee() {
  return (
    <section className="relative w-full overflow-hidden px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-[radial-gradient(circle_at_left,rgba(196,255,52,0.4),transparent_68%)] blur-2xl sm:w-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_right,rgba(196,255,52,0.32),transparent_68%)] blur-2xl sm:w-40"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            What our users are saying
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Focused feedback from players using Pawn Point to train with more structure and consistency.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3 md:items-end">
          {FEATURED_REVIEWS.map((review, index) => {
            const isCenter = index === 1;

            return (
              <article
                key={review.name}
                className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${
                  isCenter ? "md:min-h-[420px] md:-translate-y-4" : "md:min-h-[360px]"
                }`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.02))]" aria-hidden="true" />
                <div className="relative flex h-full flex-col">
                  <div className="flex-1">
                    <p className={`text-center leading-7 text-white/84 ${isCenter ? "text-base" : "text-sm sm:text-base"}`}>
                      {review.text}
                    </p>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-4 text-center">
                    <div className="text-sm font-semibold tracking-tight text-white">{review.name}</div>
                    {review.role ? <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{review.role}</div> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
