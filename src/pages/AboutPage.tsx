import { Link } from "react-router-dom";
import { METRICS, SCORING_CATEGORIES } from "../lib/metrics.constants";
import { COHORT10_URL, LEAGUE_NAME, LEARNERS_LABEL } from "../lib/triAiBrand";
import { LEADERBOARD_RANKING_NOTE, LEADERBOARD_SEARCH_NOTE } from "../lib/teamRanking";

const { totalMaxPoints } = METRICS;

const AWARDS = [
  { emoji: "🥇", title: "Team of the week", body: "Highest total score for the week." },
  { emoji: "📈", title: "Most improved", body: "Biggest jump in total score compared with the previous week." },
  { emoji: "🔥", title: "Perfect attendance", body: "Every active teammate participated this week." },
  { emoji: "🧠", title: "Deep learners", body: "Strongest quiz performance as a team." },
  { emoji: "💪", title: "Comeback team", body: "A team that was struggling last week and made a strong recovery." },
] as const;

export function AboutPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative shrink-0 overflow-hidden border-b border-tri-border bg-tri-chrome transition-colors">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(254,102,18,0.08)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-tri-ink sm:text-tri-hero">
            Welcome to {LEAGUE_NAME}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-tri-lead text-tri-muted">
            A weekly team leaderboard for {LEARNERS_LABEL} — built to celebrate progress, effort, and learning
            together, not just who finishes first.
          </p>
          <div className="tri-hero-rule" />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="tri-btn-primary" to="/leaderboard">
              View this week&apos;s board
            </Link>
            <Link className="tri-btn-outline-panel" to="/my-team">
              Find my team
            </Link>
            <a className="tri-btn-outline-panel" href={COHORT10_URL} target="_blank" rel="noreferrer">
              Cohort 10 programme
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-12">
        <section className="rounded-tri border border-tri-border bg-tri-mist p-8 shadow-card">
          <h2 className="font-display text-tri-section text-tri-forest">What is this?</h2>
          <div className="mt-4 space-y-4 font-body text-tri-lead leading-relaxed text-tri-muted">
            <p>
              The <strong className="text-tri-ink">{LEAGUE_NAME}</strong> is the public scoreboard
              for your cohort. Each week, admins upload activity from{" "}
              <strong className="text-tri-ink">Google Skills Boost</strong> and publish team results here so
              you can see how your squad is doing alongside the rest of the programme.
            </p>
            <p>
              You are placed in a <strong className="text-tri-ink">named team</strong> with other{" "}
              {LEARNERS_LABEL}.
              Your team earns points together based on completion, quizzes, participation, effort, and whether
              everyone is involved — so smaller and larger teams compete fairly.
            </p>
            <p>
              The board <strong className="text-tri-ink">resets every week</strong>. Last Saturday&apos;s
              rank does not carry over. Every team starts fresh, which keeps things motivating whether you
              are leading or catching up.
            </p>
          </div>
        </section>

        <section className="rounded-tri border border-tri-border bg-tri-surface p-8 shadow-card">
          <h2 className="font-display text-tri-section text-tri-forest">Your team</h2>
          <div className="mt-4 space-y-4 font-body text-tri-lead leading-relaxed text-tri-muted">
            <p>
              Every learner is assigned to a <strong className="text-tri-ink">named cohort team</strong> — often
              named after a landmark, river, park, or place across Africa. Teams are fixed for the programme so
              you can build rhythm with the same people each week.
            </p>
            <p>
              Use <strong className="text-tri-ink">My team</strong> in the menu to look up your assignment. Sign
              in with the <strong className="text-tri-ink">same email you use on Skills Boost</strong> — we send
              a one-time link to your inbox, then show your team page.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            <TeamInfoCard
              title="Team name & story"
              body="Each team has a short description — what the place is, why it matters, and a fun fact. It is a conversation starter for your squad, not part of the score."
            />
            <TeamInfoCard
              title="Team Discord"
              body="Your team page includes links to your team's Discord channel and invite. Use Discord to coordinate, ask questions, and stay in touch between Saturday sessions."
            />
            <TeamInfoCard
              title="Team leaders"
              body="Each team has two team leaders. They can sign in on My team to see the full roster — names, emails, and roles — so they can support teammates who need a nudge."
            />
            <TeamInfoCard
              title="Wrong team?"
              body="If your email is not found or you think you are on the wrong team, contact an admin. They can update cohort assignments in the admin tools."
            />
          </ul>
          <div className="mt-8">
            <Link className="tri-btn-primary" to="/my-team">
              Go to My team
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-display text-tri-section text-tri-forest">How to use this site</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            <StepCard
              step={1}
              title="Open the leaderboard"
              body="Use Leaderboard in the menu to see this week's published scores, the focal course, and when the board was last updated."
            />
            <StepCard
              step={2}
              title="Find your team"
              body="Use My team to sign in with your Skills Boost email, see your team name and description, and open your team's Discord channel."
            />
            <StepCard
              step={3}
              title="Track your rank"
              body={`${LEADERBOARD_SEARCH_NOTE} Teams are listed by rank — tap a row to expand it and see how points were earned in each category. ${LEADERBOARD_RANKING_NOTE}`}
            />
            <StepCard
              step={4}
              title="Check the shout-outs"
              body="Weekly awards highlight more than first place — improvement, attendance, deep learning, and comeback stories."
            />
            <StepCard
              step={5}
              title="Keep learning on Skills Boost"
              body="Scores come from your real activity. Finish the week's module, take quizzes, and support teammates who need a nudge."
            />
          </ol>
          <p className="mt-6 font-body text-tri-nav text-tri-muted">
            If the board says &ldquo;Leaderboard coming soon,&rdquo; admins have not published this week yet
            — check back after your Saturday session.
          </p>
        </section>

        <section className="rounded-tri border border-tri-border bg-tri-mist p-8 shadow-card">
          <h2 className="font-display text-tri-section text-tri-forest">
            How teams are graded ({totalMaxPoints} points)
          </h2>
          <div className="mt-4 space-y-4 font-body text-tri-lead leading-relaxed text-tri-muted">
            <p>
              Teams can earn up to <strong className="text-tri-ink">{totalMaxPoints} points</strong> each week
              from Skills Boost activity on that week&apos;s focal course. Points come from five areas:
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SCORING_CATEGORIES.map((c) => (
                <li
                  key={c.id}
                  className="rounded-tri border border-tri-border bg-tri-surface p-4 shadow-card"
                >
                  <p className="font-display text-base font-semibold text-tri-forest">{c.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-tri-muted">{c.description}</p>
                </li>
              ))}
            </ul>
            <p>
              Admins choose one focal course per week — only activity on that course counts toward the
              leaderboard. Tap any team on the board to see how its points break down.
            </p>
            <p>
              The board resets every week, so every team gets a fresh start regardless of last Saturday&apos;s
              rank.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-tri-section text-tri-forest">Weekly shout-outs</h2>
          <p className="mt-2 font-body text-tri-lead text-tri-muted">
            Awards appear on the leaderboard when admins publish the week. They are separate from the point
            total — a team can win a shout-out without topping the table.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AWARDS.map((a) => (
              <li
                key={a.title}
                className="flex gap-4 rounded-tri border border-tri-border bg-tri-surface p-5 shadow-card"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {a.emoji}
                </span>
                <div>
                  <p className="font-nav text-xs font-semibold uppercase tracking-wide text-tri-faint">
                    {a.title}
                  </p>
                  <p className="mt-1 font-body text-sm leading-relaxed text-tri-muted">{a.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-tri border border-tri-border bg-tri-mist p-8 shadow-card">
          <h2 className="font-display text-tri-section text-tri-forest">A note for {LEARNERS_LABEL}</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 font-body text-tri-lead leading-relaxed text-tri-muted">
            <li>
              This site shows <strong className="text-tri-ink">team summaries only</strong> — not individual
              grades or private emails. Admins work with raw exports behind the scenes; you see the curated
              board.
            </li>
            <li>
              Teams are fixed for the cohort. If you think you are on the wrong team, contact an admin — they
              can update assignments in the admin tools, or use{" "}
              <Link className="font-semibold text-tri-leaf hover:underline" to="/my-team">
                My team
              </Link>{" "}
              to confirm which team you are on.
            </li>
            <li>
              The league is meant to encourage <strong className="text-tri-ink">collaboration</strong>.
              Celebrate teammates, share resources on your team Discord, and use the board as feedback on how
              your group is engaging with the programme.
            </li>
          </ul>
        </section>

        <section className="flex flex-col items-start gap-4 rounded-tri border border-tri-orange/30 bg-tri-orange-dim p-8">
          <h2 className="font-display text-2xl text-tri-forest">Ready to see where your team stands?</h2>
          <p className="max-w-xl font-body text-tri-lead text-tri-muted">
            Check the weekly leaderboard, or sign in to My team for your assignment, team story, and Discord
            links.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="tri-btn-primary" to="/leaderboard">
              Go to leaderboard
            </Link>
            <Link className="tri-btn-outline-panel" to="/my-team">
              Go to My team
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function StepCard({ step, title, body }: { step: number; title: string; body: string }) {
  return (
    <li className="rounded-tri border border-tri-border bg-tri-surface p-5 shadow-card">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tri-leaf/15 font-display text-sm font-bold text-tri-forest">
        {step}
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold text-tri-forest">{title}</h3>
      <p className="mt-2 font-body text-sm leading-relaxed text-tri-muted">{body}</p>
    </li>
  );
}

function TeamInfoCard({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-tri border border-tri-border bg-tri-mist/50 p-5">
      <h3 className="font-display text-lg font-semibold text-tri-forest">{title}</h3>
      <p className="mt-2 font-body text-sm leading-relaxed text-tri-muted">{body}</p>
    </li>
  );
}
