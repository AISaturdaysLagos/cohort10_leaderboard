import { useMemo, useState } from "react";
import type { TeamMetricBreakdown } from "../types";
import { filterRankedTeamMetrics, LEADERBOARD_RANKING_NOTE, LEADERBOARD_SEARCH_NOTE } from "../lib/teamRanking";
import { TeamLeaderboardRow } from "./TeamLeaderboardRow";

type Props = {
  metrics: TeamMetricBreakdown[];
  variant?: "student" | "mentor";
  emptyMessage?: string;
  searchPlaceholder?: string;
};

export function TeamRankingList({
  metrics,
  variant = "student",
  emptyMessage = "No teams on the board yet.",
  searchPlaceholder = "Search team name…",
}: Props) {
  const [search, setSearch] = useState("");
  const searchActive = Boolean(search.trim());

  const visible = useMemo(() => filterRankedTeamMetrics(metrics, search), [metrics, search]);

  const searchSummary = useMemo(() => {
    if (!searchActive) return null;
    if (visible.length === 0) return "No teams match your search.";
    if (visible.length === metrics.length) return `All ${metrics.length} teams`;
    return `${visible.length} of ${metrics.length} teams`;
  }, [searchActive, visible.length, metrics.length]);

  if (!metrics.length) {
    return (
      <p className="font-body text-tri-nav text-tri-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="search"
          className="w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav sm:max-w-md"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search teams"
        />
        {searchSummary ? (
          <p className="mt-2 font-body text-xs text-tri-muted">{searchSummary}</p>
        ) : (
          <p className="mt-2 font-body text-xs leading-relaxed text-tri-muted">
            {LEADERBOARD_SEARCH_NOTE} {LEADERBOARD_RANKING_NOTE}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-tri border border-dashed border-tri-border bg-tri-mist/50 px-4 py-8 text-center font-body text-tri-nav text-tri-muted">
          No teams match &ldquo;{search.trim()}&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {variant === "mentor" && !searchActive ? (
            <p className="font-body text-tri-nav text-tri-muted">
              Tap a team to expand category scores. Collapsed view shows rank, name, and total only.
            </p>
          ) : null}
          {visible.map(({ m, rank }) => (
            <TeamLeaderboardRow
              key={m.team}
              rank={rank}
              m={m}
              variant={variant}
              defaultOpen={searchActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
