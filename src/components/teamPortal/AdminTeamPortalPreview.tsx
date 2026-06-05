import { useMemo, useState } from "react";
import type { TeamAssignmentRow, TeamDescription, TeamDiscordLink, TeamMemberProfile, TeamPortalContext } from "../../types";
import { listTeamsForPortal, resolveTeamPortalForTeam } from "../../lib/teamPortal";
import { TeamPortalLeaderView, TeamPortalStudentView } from "./TeamPortalViews";

type AdminTeamPortalPreviewProps = {
  assignments: TeamAssignmentRow[];
  profiles: Map<string, TeamMemberProfile>;
  descriptions: Map<string, TeamDescription>;
  discordLinks: Map<string, TeamDiscordLink>;
  signedInEmail: string | null;
};

type PreviewMode = "student" | "leader";

export function AdminTeamPortalPreview({
  assignments,
  profiles,
  descriptions,
  discordLinks,
  signedInEmail,
}: AdminTeamPortalPreviewProps) {
  const teams = useMemo(() => listTeamsForPortal(assignments), [assignments]);
  const [teamId, setTeamId] = useState(() => teams[0]?.teamId ?? "");
  const [mode, setMode] = useState<PreviewMode>("student");

  const effectiveTeamId = teamId || teams[0]?.teamId || "";

  const context: TeamPortalContext | null = useMemo(() => {
    if (!effectiveTeamId) return null;
    return resolveTeamPortalForTeam(effectiveTeamId, assignments, profiles, descriptions, discordLinks, {
      asLeader: mode === "leader",
    });
  }, [effectiveTeamId, assignments, profiles, descriptions, discordLinks, mode]);

  if (teams.length === 0) {
    return (
      <div className="rounded border border-dashed border-tri-border bg-tri-mist/40 px-4 py-10 text-center font-body text-tri-muted">
        No team assignments loaded yet. Upload team data from Admin → Team management.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-tri-border bg-tri-sand p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Admin preview</p>
        <h2 className="mt-2 font-display text-2xl text-tri-forest">Browse teams as students see them</h2>
        <p className="mt-2 max-w-2xl font-body text-sm text-tri-muted">
          {signedInEmail ? (
            <>
              Signed in as admin <strong className="text-tri-ink">{signedInEmail}</strong>. Pick a team and preview
              the student or team leader experience.
            </>
          ) : (
            "Pick a team and preview the student or team leader experience."
          )}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="font-body text-tri-nav">
            <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Team</span>
            <select
              className="mt-1 w-full rounded border border-tri-border-md bg-tri-surface px-3 py-2 text-sm"
              value={effectiveTeamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamId} · {t.teamName} ({t.memberCount})
                </option>
              ))}
            </select>
          </label>
          <label className="font-body text-tri-nav">
            <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Preview as</span>
            <select
              className="mt-1 w-full rounded border border-tri-border-md bg-tri-surface px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as PreviewMode)}
            >
              <option value="student">Student — team name & description</option>
              <option value="leader">Team leader — description + roster</option>
            </select>
          </label>
        </div>
      </section>

      {context ? (
        mode === "leader" ? (
          <TeamPortalLeaderView context={context} preview />
        ) : (
          <TeamPortalStudentView context={context} preview />
        )
      ) : null}
    </div>
  );
}
