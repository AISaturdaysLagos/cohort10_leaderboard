import { METRICS } from "../lib/metrics.constants";
import { fmt1, pct } from "../lib/format";
import type { TeamMetricBreakdown } from "../types";

type Props = {
  metrics: TeamMetricBreakdown[];
  emptyMessage?: string;
};

export function MentorLeaderboardTable({
  metrics,
  emptyMessage = "No teams in this snapshot.",
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left font-body text-tri-nav">
        <thead>
          <tr className="border-b border-tri-border bg-tri-mist text-xs font-nav uppercase tracking-wide text-tri-faint">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Completion /{METRICS.weights.completion}</th>
            <th className="px-4 py-3">Quiz /{METRICS.weights.quiz}</th>
            <th className="px-4 py-3">Participation /{METRICS.weights.participation}</th>
            <th className="px-4 py-3">Effort /{METRICS.weights.effort}</th>
            <th className="px-4 py-3">Consistency /{METRICS.weights.consistency}</th>
            <th className="px-4 py-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={m.team} className={i % 2 === 0 ? "bg-tri-surface" : "bg-tri-mist/60"}>
              <td className="px-4 py-3 font-medium text-tri-muted">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-tri-forest">{m.team}</td>
              <td className="px-4 py-3 font-display text-lg font-bold text-tri-leaf">{fmt1(m.totalScore)}</td>
              <td className="px-4 py-3 text-tri-muted">
                {fmt1(m.completionPoints)}{" "}
                <span className="text-xs text-tri-faint">
                  ({m.completedCount}/{m.activeMembers} · {pct(m.completionRate)})
                </span>
              </td>
              <td className="px-4 py-3 text-tri-muted">
                {fmt1(m.quizPoints)}{" "}
                <span className="text-xs text-tri-faint">(avg {pct(m.avgQuiz)})</span>
              </td>
              <td className="px-4 py-3 text-tri-muted">
                {fmt1(m.participationPoints)}{" "}
                <span className="text-xs text-tri-faint">
                  ({m.participatedCount}/{m.activeMembers})
                </span>
              </td>
              <td className="px-4 py-3 text-tri-muted">
                {fmt1(m.effortPoints)}{" "}
                <span className="text-xs text-tri-faint">(avg {fmt1(m.avgLearningMinutes)} min)</span>
              </td>
              <td className="px-4 py-3 text-tri-muted">
                {fmt1(m.consistencyPoints)}{" "}
                <span className="text-xs text-tri-faint">({m.inactiveCount} inactive)</span>
              </td>
              <td className="px-4 py-3 text-tri-muted">{m.activeMembers}</td>
            </tr>
          ))}
          {!metrics.length && (
            <tr>
              <td className="px-4 py-10 text-center text-tri-muted" colSpan={9}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
