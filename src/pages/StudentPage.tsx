import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribePublished, type PublishedLeaderboard } from "../lib/published";
import { TeamRankingList } from "../components/TeamRankingList";
import { formatAwardTeams } from "../lib/format";
import { METRICS, SCORING_CATEGORIES } from "../lib/metrics.constants";
import { LEAGUE_NAME } from "../lib/triAiBrand";

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
      <header className="relative shrink-0 overflow-hidden border-b border-tri-border bg-tri-chrome transition-colors">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(254,102,18,0.08)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
          <span className="tri-hero-tag mt-4">Weekly leaderboard</span>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-tri-ink sm:text-tri-hero">
            Team leaderboard
          </h1>
          <p className="mt-3 max-w-2xl font-body text-tri-lead text-tri-muted">
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
            <Link className="tri-btn-outline-panel" to="/">
              About the league
            </Link>
            <Link className="tri-btn-outline-panel" to="/my-team">
              My team
            </Link>
            <Link className="tri-btn-outline-panel" to="/admin">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-12">
        {loadError && (
          <div className="tri-alert-error">
            Could not load the leaderboard: {loadError}
          </div>
        )}
        {loading && (
          <div className="rounded border border-tri-border bg-tri-sand p-10 text-center shadow-card">
            <p className="font-body text-tri-lead text-tri-muted">Loading leaderboard…</p>
          </div>
        )}
        {!loading && !data && (
          <div className="rounded-tri border border-dashed border-tri-border bg-tri-mist/50 p-10 text-center shadow-card">
            <h2 className="font-display text-tri-section text-tri-forest">Leaderboard coming soon</h2>
            <p className="mx-auto mt-4 max-w-md font-body text-tri-lead text-tri-muted">
              This week&apos;s team scores are not posted yet. Check back after your Saturday session — your
              admins will share the board here when it&apos;s ready.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            <section className="flex flex-col gap-4 rounded-tri border border-tri-border bg-tri-mist p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-faint">
                  This week
                </p>
                <p className="mt-1 font-display text-tri-section text-tri-forest">{data.weekLabel}</p>
                <p className="mt-3 font-body text-tri-lead text-tri-muted">
                  This week&apos;s focus:{" "}
                  <span className="font-medium text-tri-ink">{data.focalActivity}</span>
                </p>
              </div>
              <div className="text-left font-body text-tri-nav text-tri-muted sm:text-right">
                <p>Updated</p>
                <p className="font-medium text-tri-ink">{publishedAtLabel(data.publishedAt)}</p>
              </div>
            </section>

            {awards && (
              <section>
                <h2 className="font-display text-tri-section text-tri-forest">Shout-outs</h2>
                <p className="mt-2 font-body text-tri-lead text-tri-muted">Celebrating more than first place.</p>
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
              <p className="mt-2 font-body text-tri-lead text-tri-muted">
                Out of {METRICS.totalMaxPoints} points this week. Tap a team to see how points were earned.
              </p>
              <div className="mt-8">
                <TeamRankingList metrics={metrics} variant="student" />
              </div>
            </section>

            <section className="rounded-tri border border-tri-border bg-tri-mist p-8 font-body text-tri-lead text-tri-muted">
              <h3 className="font-display text-2xl text-tri-forest">How your team earns points</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
                {SCORING_CATEGORIES.map((c) => (
                  <li key={c.id}>
                    <strong>{c.label}</strong> — {c.description}
                  </li>
                ))}
              </ul>
              <p className="mt-4 leading-relaxed text-tri-muted">
                Teams can earn up to {METRICS.totalMaxPoints} points each week. The board resets every week so
                every team gets a fresh start.{" "}
                <Link className="font-semibold text-tri-orange no-underline hover:text-tri-leaf" to="/">
                  Read the full guide
                </Link>
                .
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StudentAward({ title, emoji, teams }: { title: string; emoji: string; teams: string[] }) {
  return (
    <li className="flex gap-4 rounded-tri border border-tri-border bg-tri-surface p-5 shadow-card">
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-nav text-tri-nav font-medium uppercase tracking-wide text-tri-faint">{title}</p>
        <p className="mt-1 font-display text-xl font-semibold text-tri-leaf">{formatAwardTeams(teams)}</p>
      </div>
    </li>
  );
}
