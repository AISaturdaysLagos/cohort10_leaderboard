import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribePublished, type PublishedLeaderboard } from "../lib/published";
import { fmt1, formatAwardTeams, pct } from "../lib/format";
import { METRICS } from "../lib/metrics.constants";
import type { TeamMetricBreakdown } from "../types";

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function publishedAtLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function StudentPage() {
  const [data, setData] = useState<PublishedLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    const unsub = subscribePublished(
      (published) => {
        setData(published);
        setLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const metrics = data?.metrics ?? [];
  const awards = data?.awards;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative shrink-0 overflow-hidden border-b border-black/8 bg-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(254,102,18,0.08)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="text-xs text-tri-ink/40">TRI AI Saturdays · League</p>
          <span className="tri-hero-tag mt-4">Weekly leaderboard</span>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-tri-ink sm:text-tri-hero">
            Team leaderboard
          </h1>
          <p className="mt-3 max-w-2xl font-body text-tri-lead text-tri-ink/70">
            Weekly scores from Skills Boost activity — completion, understanding, participation, effort, and
            consistency. Fair across team sizes; resets every week.
          </p>
          <div className="tri-hero-rule" />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              className="tri-btn-primary"
              href="https://aisaturdayslagos.github.io/cohort_structure/cohort10/"
              target="_blank"
              rel="noreferrer"
            >
              Cohort 10 programme
            </a>
            <Link className="tri-btn-outline-panel" to="/admin">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-12">
        {loadError && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 font-body text-sm text-red-900">
            Could not load the leaderboard: {loadError}
          </div>
        )}
        {loading && (
          <div className="rounded border border-neutral-200 bg-tri-sand p-10 text-center shadow-card">
            <p className="font-body text-tri-lead text-tri-ink/70">Loading leaderboard…</p>
          </div>
        )}
        {!loading && !data && (
          <div className="rounded-tri border border-dashed border-black/15 bg-tri-mist/50 p-10 text-center shadow-card">
            <h2 className="font-display text-tri-section text-tri-forest">Leaderboard coming soon</h2>
            <p className="mx-auto mt-4 max-w-md font-body text-tri-lead text-tri-ink/80">
              This week&apos;s team scores are not posted yet. Check back after your Saturday session — your
              mentor will share the board here when it&apos;s ready.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            <section className="flex flex-col gap-4 rounded-tri border border-black/10 bg-tri-mist p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">
                  This week
                </p>
                <p className="mt-1 font-display text-tri-section text-tri-forest">{data.weekLabel}</p>
                <p className="mt-3 font-body text-tri-lead text-tri-ink/80">
                  This week&apos;s focus:{" "}
                  <span className="font-medium text-tri-ink">{data.focalActivity}</span>
                </p>
              </div>
              <div className="text-left font-body text-tri-nav text-tri-ink/60 sm:text-right">
                <p>Updated</p>
                <p className="font-medium text-tri-ink">{publishedAtLabel(data.publishedAt)}</p>
              </div>
            </section>

            {awards && (
              <section>
                <h2 className="font-display text-tri-section text-tri-forest">Shout-outs</h2>
                <p className="mt-2 font-body text-tri-lead text-tri-ink/75">Celebrating more than first place.</p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StudentAward title="Team of the week" emoji="🥇" teams={awards.teamOfTheWeek} />
                  <StudentAward title="Most improved" emoji="📈" teams={awards.mostImproved} />
                  <StudentAward title="Perfect attendance" emoji="🔥" teams={awards.perfectAttendance} />
                  <StudentAward title="Deep learners" emoji="🧠" teams={awards.deepLearners} />
                  <StudentAward title="Comeback team" emoji="💪" teams={awards.comebackTeam} />
                </ul>
              </section>
            )}

            <section>
              <h2 className="font-display text-tri-section text-tri-forest">Rankings</h2>
              <p className="mt-2 font-body text-tri-lead text-tri-ink/75">
                Out of {METRICS.totalMaxPoints} points this week.
              </p>
              <div className="mt-8 space-y-4">
                {metrics.map((m, i) => (
                  <StudentTeamRow key={m.team} rank={i + 1} m={m} />
                ))}
              </div>
            </section>

            <section className="rounded-tri border border-black/10 bg-tri-mist p-8 font-body text-tri-lead text-tri-ink/85">
              <h3 className="font-display text-2xl text-tri-forest">How your team earns points</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
                <li>
                  <strong>Completion</strong> — finishing this week&apos;s module on Skills Boost
                </li>
                <li>
                  <strong>Quiz</strong> — how well your team does on the course quizzes
                </li>
                <li>
                  <strong>Participation</strong> — showing up and starting the weekly work
                </li>
                <li>
                  <strong>Effort</strong> — time spent learning (up to about two hours per person counts fully)
                </li>
                <li>
                  <strong>Together</strong> — everyone on the team takes part, not just a few people
                </li>
              </ul>
              <p className="mt-4 leading-relaxed text-tri-ink/75">
                Teams can earn up to {METRICS.totalMaxPoints} points each week. The board resets every week so
                every team gets a fresh start.
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="mt-auto shrink-0 border-t border-white/10 bg-tri-night px-4 py-10 text-center font-body text-tri-nav text-white/75">
        <p>
          <a
            className="font-semibold text-tri-orange no-underline hover:text-tri-leaf"
            href="https://tri-ai.org"
            target="_blank"
            rel="noreferrer"
          >
            triAI
          </a>{" "}
          — Teaching · Research · Innovation
        </p>
      </footer>
    </div>
  );
}

function StudentAward({ title, emoji, teams }: { title: string; emoji: string; teams: string[] }) {
  return (
    <li className="flex gap-4 rounded-tri border border-black/10 bg-white p-5 shadow-card">
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">{title}</p>
        <p className="mt-1 font-display text-xl font-semibold text-tri-leaf">{formatAwardTeams(teams)}</p>
      </div>
    </li>
  );
}

function StudentTeamRow({ rank, m }: { rank: number; m: TeamMetricBreakdown }) {
  const mdl = medal(rank);
  return (
    <article className="overflow-hidden rounded-tri border border-black/10 bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-black/10 bg-tri-mist px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded bg-tri-leaf font-display text-xl font-semibold text-white shadow-tri">
            {mdl ? <span title={`Rank ${rank}`}>{mdl}</span> : <span>{rank}</span>}
          </span>
          <div>
            <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">Team</p>
            <h3 className="font-display text-2xl font-semibold leading-tight text-tri-forest">{m.team}</h3>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">Weekly score</p>
          <p className="font-display text-4xl font-bold leading-tight text-tri-leaf">{fmt1(m.totalScore)}</p>
          <p className="font-body text-tri-nav text-tri-ink/55">out of {METRICS.totalMaxPoints}</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-5">
        <ScorePill
          label="Completion"
          value={m.completionPoints}
          max={METRICS.weights.completion}
          hint={pct(m.completionRate)}
        />
        <ScorePill label="Quiz" value={m.quizPoints} max={METRICS.weights.quiz} hint={pct(m.avgQuiz)} />
        <ScorePill
          label="Participation"
          value={m.participationPoints}
          max={METRICS.weights.participation}
          hint={`${m.participatedCount}/${m.activeMembers}`}
        />
        <ScorePill
          label="Effort"
          value={m.effortPoints}
          max={METRICS.weights.effort}
          hint={`${fmt1(m.avgLearningMinutes)} min avg`}
        />
        <ScorePill
          label="Together"
          value={m.consistencyPoints}
          max={METRICS.weights.consistency}
          hint="whole team engaged"
        />
      </div>
    </article>
  );
}

function ScorePill({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint: string;
}) {
  const pctBar = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="rounded-tri border border-black/10 bg-white p-3">
      <p className="font-nav text-[10px] font-bold uppercase tracking-wide text-tri-ink/50">{label}</p>
      <p className="mt-1 font-semibold text-tri-forest">
        {fmt1(value)} <span className="text-xs font-normal text-tri-ink/50">/ {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-tri-leaf transition-all"
          style={{ width: `${pctBar}%` }}
        />
      </div>
      <p className="mt-2 font-body text-[11px] leading-snug text-tri-ink/60">{hint}</p>
    </div>
  );
}
