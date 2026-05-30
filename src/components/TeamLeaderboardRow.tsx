import { METRICS } from "../lib/metrics.constants";
import { fmt1, pct } from "../lib/format";
import type { TeamMetricBreakdown } from "../types";

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

type Props = {
  rank: number;
  m: TeamMetricBreakdown;
  /** Mentor expanded panel includes roster counts and inactive members. */
  variant?: "student" | "mentor";
  /** Open the breakdown panel by default (e.g. when surfaced by search). */
  defaultOpen?: boolean;
};

export function TeamLeaderboardRow({ rank, m, variant = "student", defaultOpen = false }: Props) {
  const mdl = medal(rank);
  const rankLabel = mdl || String(rank);

  return (
    <article className="overflow-hidden rounded-tri border border-tri-border bg-tri-surface shadow-card">
      <details className="group" open={defaultOpen || undefined}>
        <summary
          className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-tri-mist/60 [&::-webkit-details-marker]:hidden"
          aria-label={`${m.team}, rank ${rank}, ${fmt1(m.totalScore)} points. Show score breakdown.`}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-tri-leaf font-display text-lg font-semibold text-white shadow-tri"
            aria-hidden
          >
            {mdl ? <span title={`Rank ${rank}`}>{mdl}</span> : rankLabel}
          </span>
          <span className="min-w-0 flex-1 font-display text-lg font-semibold leading-tight text-tri-forest sm:text-xl">
            {m.team}
          </span>
          <span className="shrink-0 text-right">
            <span className="font-display text-2xl font-bold leading-none text-tri-leaf sm:text-3xl">
              {fmt1(m.totalScore)}
            </span>
            <span className="sr-only"> points this week</span>
          </span>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-tri-border text-tri-muted transition-transform group-open:rotate-180"
            aria-hidden
          >
            <ChevronIcon />
          </span>
        </summary>

        <div className="border-t border-tri-border bg-tri-mist/30 px-4 py-4">
          {variant === "student" ? (
            <StudentMetricPills m={m} />
          ) : (
            <MentorMetricDetails m={m} />
          )}
        </div>
      </details>
    </article>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StudentMetricPills({ m }: { m: TeamMetricBreakdown }) {
  return (
    <>
      <p className="mb-3 font-body text-tri-nav text-tri-muted">
        Out of {METRICS.totalMaxPoints} points this week — breakdown by category.
      </p>
      <div className="grid gap-3 sm:grid-cols-5">
        <ScorePill
          label="Completion"
          value={m.completionPoints}
          hint={pct(m.completionRate)}
        />
        <ScorePill label="Quiz" value={m.quizPoints} hint={pct(m.avgQuiz)} />
        <ScorePill
          label="Participation"
          value={m.participationPoints}
          hint={`${m.participatedCount}/${m.activeMembers}`}
        />
        <ScorePill
          label="Effort"
          value={m.effortPoints}
          hint={`${fmt1(m.avgLearningMinutes)} min avg`}
        />
        <ScorePill
          label="Together"
          value={m.consistencyPoints}
          hint="whole team engaged"
        />
      </div>
    </>
  );
}

function MentorMetricDetails({ m }: { m: TeamMetricBreakdown }) {
  return (
    <div className="grid gap-3 font-body text-tri-nav sm:grid-cols-2 lg:grid-cols-3">
      <MetricDetail
        label="Completion"
        points={m.completionPoints}
        max={METRICS.weights.completion}
        detail={`${m.completedCount}/${m.activeMembers} completed · ${pct(m.completionRate)}`}
      />
      <MetricDetail
        label="Quiz"
        points={m.quizPoints}
        max={METRICS.weights.quiz}
        detail={`avg ${pct(m.avgQuiz)}`}
      />
      <MetricDetail
        label="Participation"
        points={m.participationPoints}
        max={METRICS.weights.participation}
        detail={`${m.participatedCount}/${m.activeMembers} participated`}
      />
      <MetricDetail
        label="Effort"
        points={m.effortPoints}
        max={METRICS.weights.effort}
        detail={`avg ${fmt1(m.avgLearningMinutes)} min · ratio ${fmt1(m.effortRatio)}`}
      />
      <MetricDetail
        label="Consistency"
        points={m.consistencyPoints}
        max={METRICS.weights.consistency}
        detail={`${m.inactiveCount} inactive · ${pct(m.consistencyRate)} engaged`}
      />
      <div className="rounded-tri border border-tri-border bg-tri-surface p-3">
        <p className="font-nav text-[10px] font-bold uppercase tracking-wide text-tri-faint">
          Active members
        </p>
        <p className="mt-1 font-semibold text-tri-forest">{m.activeMembers}</p>
      </div>
    </div>
  );
}

function MetricDetail({
  label,
  points,
  max,
  detail,
}: {
  label: string;
  points: number;
  max: number;
  detail: string;
}) {
  const pctBar = max > 0 ? Math.min(100, (points / max) * 100) : 0;
  return (
    <div className="rounded-tri border border-tri-border bg-tri-surface p-3">
      <p className="font-nav text-[10px] font-bold uppercase tracking-wide text-tri-faint">{label}</p>
      <p className="mt-1 font-semibold text-tri-forest">
        {fmt1(points)} <span className="text-xs font-normal text-tri-faint">/ {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tri-border-md">
        <div className="h-full rounded-full bg-tri-leaf" style={{ width: `${pctBar}%` }} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-tri-muted">{detail}</p>
    </div>
  );
}

function ScorePill({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-tri border border-tri-border bg-tri-surface p-3">
      <p className="font-nav text-[10px] font-bold uppercase tracking-wide text-tri-faint">{label}</p>
      <p className="mt-1 font-semibold text-tri-forest">{fmt1(value)}</p>
      <p className="mt-2 font-body text-[11px] leading-snug text-tri-muted">{hint}</p>
    </div>
  );
}
