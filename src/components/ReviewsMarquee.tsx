type Testimonial = {
  name: string;
  role: string;
  initials: string;
  avatarClass: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Ethan Jacobs",
    role: "Club Player",
    initials: "EJ",
    avatarClass: "from-[#2f3a34] to-[#8e7b4d]",
    quote:
      "Pawn Point makes training feel clear. I can see what to study next, what I already finished, and where my games keep breaking down.",
  },
  {
    name: "Lina Meyer",
    role: "Junior Coach",
    initials: "LM",
    avatarClass: "from-[#273748] to-[#6f8a96]",
    quote:
      "The club tools give my students one place to work. Courses, puzzles, ranks, and feedback finally feel connected instead of scattered.",
  },
  {
    name: "Noah Singh",
    role: "Tournament Player",
    initials: "NS",
    avatarClass: "from-[#3b3028] to-[#a46f4b]",
    quote:
      "The BlackBook is the first study space that actually fits how I prepare. I can keep openings, notes, and analysis in one clean flow.",
  },
  {
    name: "Maya Collins",
    role: "Student",
    initials: "MC",
    avatarClass: "from-[#263632] to-[#5f8d72]",
    quote:
      "I like that progress is visible without feeling noisy. It keeps me consistent and makes every session feel like it has a purpose.",
  },
  {
    name: "Daniel Brooks",
    role: "Chess Parent",
    initials: "DB",
    avatarClass: "from-[#3b3444] to-[#8a7598]",
    quote:
      "Pawn Point gives structure to practice at home. My son knows exactly what to work on before the next club session.",
  },
  {
    name: "Aria Khan",
    role: "Club Admin",
    initials: "AK",
    avatarClass: "from-[#323232] to-[#b9a164]",
    quote:
      "Managing a training group is much easier. I can separate club content, keep students focused, and see who is actually progressing.",
  },
  {
    name: "Oliver Grant",
    role: "Rapid 1700",
    initials: "OG",
    avatarClass: "from-[#2d3340] to-[#6c7ea8]",
    quote:
      "The platform feels serious without being complicated. It removes the random scrolling and gets me straight into useful chess work.",
  },
  {
    name: "Sofia Patel",
    role: "Academy Student",
    initials: "SP",
    avatarClass: "from-[#3a2f35] to-[#9b6a7f]",
    quote:
      "The courses and puzzles feel connected to my improvement. It is much easier to stay motivated when the next step is obvious.",
  },
  {
    name: "Marcus Reid",
    role: "Coach",
    initials: "MR",
    avatarClass: "from-[#2c382f] to-[#7f9364]",
    quote:
      "Pawn Point gives clubs the training layer they usually have to build manually. It is organized, focused, and simple for students to follow.",
  },
];

const testimonialColumns = [
  testimonials.slice(0, 3),
  testimonials.slice(3, 6),
  testimonials.slice(6, 9),
];

export default function ReviewsMarquee() {
  return (
    <section className="relative w-full overflow-hidden px-4 py-16 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Loved by the Community
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            Players, coaches, and clubs use Pawn Point to bring structure, progress, and purpose into every training session.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {testimonialColumns.map((column, columnIndex) => (
            <div className="space-y-3" key={columnIndex}>
              {column.map((testimonial) => (
                <article
                  key={`${testimonial.name}-${testimonial.role}`}
                  className="rounded-lg border border-white/14 bg-[#151515]/82 p-6 text-white shadow-[0_18px_55px_rgba(0,0,0,0.22)]"
                >
                  <div className="grid grid-cols-[auto_1fr] gap-3">
                    <div
                      aria-hidden="true"
                      className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.avatarClass} text-[11px] font-semibold tracking-wide text-white shadow-inner shadow-white/10`}
                    >
                      {testimonial.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold leading-5 text-white">
                        {testimonial.name}
                      </h3>
                      <span className="block text-sm leading-5 tracking-wide text-white/58">
                        {testimonial.role}
                      </span>
                      <blockquote className="mt-4">
                        <p className="text-[15px] leading-7 text-white/88">
                          {testimonial.quote}
                        </p>
                      </blockquote>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
