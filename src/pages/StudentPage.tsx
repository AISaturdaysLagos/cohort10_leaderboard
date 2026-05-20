import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadPublished, PUBLISH_EVENT, PUBLISHED_STORAGE_KEY, type PublishedLeaderboard } from "../lib/published";
import { fmt1, pct } from "../lib/format";
import { METRICS } from "../lib/metrics.js";
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
  const [data, setData] = useState<PublishedLeaderboard | null>(() => loadPublished());

  const refresh = useCallback(() => {
    setData(loadPublished());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === PUBLISHED_STORAGE_KEY || e.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PUBLISH_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PUBLISH_EVENT, refresh);
    };
  }, [refresh]);

  const metrics = data?.metrics ?? [];
  const awards = data?.awards;

  return (
    <>
      <header className="border-b border-black/10 bg-tri-forest text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <p className="font-body text-sm text-white/80 sm:text-tri-nav">TRI AI · AI Saturdays League</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-[1.1] text-white sm:mt-3 sm:text-4xl">
            Team leaderboard
          </h1>
          <p className="mt-3 max-w-2xl font-body text-base leading-snug text-white/90 sm:text-tri-lead">
            Weekly scores from Skills Boost activity — completion, understanding, participation, effort, and
            consistency. Fair across team sizes; resets every week.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
            <a className="tri-btn-primary" href="https://tri-ai.org" target="_blank" rel="noreferrer">
              About TRI AI
            </a>
            <Link className="tri-btn-outline-hero" to="/admin">
              Mentor admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        {!data && (
          <div className="rounded border border-dashed border-neutral-300 bg-tri-sand p-10 text-center shadow-card">
            <h2 className="font-display text-tri-section text-tri-forest">No published week yet</h2>
            <p className="mx-auto mt-4 max-w-md font-body text-tri-lead text-tri-ink/80">
              Your mentor will publish this week&apos;s board from the admin page after uploading the cohort
              export. If you&apos;re testing locally, open Admin and click{" "}
              <strong>Publish to student page</strong>.
            </p>
            <Link to="/admin" className="tri-btn-primary mt-8 inline-flex">
              Go to admin
            </Link>
          </div>
        )}

        {data && (
          <>
            <section className="flex flex-col gap-4 rounded border border-neutral-200 bg-tri-sand p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">
                  Published week
                </p>
                <p className="mt-1 font-display text-tri-section text-tri-forest">{data.weekLabel}</p>
                <p className="mt-3 font-body text-tri-lead text-tri-ink/80">
                  This week&apos;s focus:{" "}
                  <span className="font-medium text-tri-ink">{data.focalActivity}</span>
                </p>
              </div>
              <div className="text-left font-body text-tri-nav text-tri-ink/60 sm:text-right">
                <p>Last updated</p>
                <p className="font-medium text-tri-ink">{publishedAtLabel(data.publishedAt)}</p>
              </div>
            </section>

            {awards && (
              <section>
                <h2 className="font-display text-tri-section text-tri-forest">Shout-outs</h2>
                <p className="mt-2 font-body text-tri-lead text-tri-ink/75">Celebrating more than first place.</p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StudentAward title="Team of the week" emoji="🥇" team={awards.teamOfTheWeek} />
                  <StudentAward title="Most improved" emoji="📈" team={awards.mostImproved} />
                  <StudentAward title="Perfect attendance" emoji="🔥" team={awards.perfectAttendance} />
                  <StudentAward title="Deep learners" emoji="🧠" team={awards.deepLearners} />
                  <StudentAward title="Comeback team" emoji="💪" team={awards.comebackTeam} />
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

            <section className="rounded border border-neutral-200 bg-tri-sand p-8 font-body text-tri-lead text-tri-ink/85">
              <h3 className="font-display text-2xl text-tri-forest">How scoring works</h3>
              <p className="mt-4 leading-relaxed">
                Teams earn up to <strong>{METRICS.totalMaxPoints}</strong> points from five ingredients:
                finishing the weekly module ({METRICS.weights.completion} pts), quiz quality (
                {METRICS.weights.quiz} pts), showing up ({METRICS.weights.participation} pts), time on task (
                {METRICS.weights.effort} pts, capped at {METRICS.effort.expectedWeeklyMinutesPerMember} min/week
                per member), and everyone contributing ({METRICS.weights.consistency} pts). Mentors tune the week
                and course so we compare apples to apples as the programme moves forward.
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="bg-tri-night px-4 py-10 text-center font-body text-tri-nav text-white/75">
        <p>
          <a className="font-medium text-tri-leaf no-underline hover:text-tri-mint" href="https://tri-ai.org" target="_blank" rel="noreferrer">
            TRI AI
          </a>{" "}
          — Teaching, Research and Innovation in Artificial Intelligence.
        </p>
      </footer>
    </>
  );
}

function StudentAward({ title, emoji, team }: { title: string; emoji: string; team: string | null }) {
  return (
    <li className="flex gap-4 rounded border border-neutral-200 bg-tri-sand p-5 shadow-card">
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-ink/50">{title}</p>
        <p className="mt-1 font-display text-xl font-semibold text-tri-leaf">{team ?? "—"}</p>
      </div>
    </li>
  );
}

function StudentTeamRow({ rank, m }: { rank: number; m: TeamMetricBreakdown }) {
  const mdl = medal(rank);
  return (
    <article className="overflow-hidden rounded border border-neutral-200 bg-tri-sand shadow-card">
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-tri-mist px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
    <div className="rounded border border-neutral-200 bg-tri-sand p-3">
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
