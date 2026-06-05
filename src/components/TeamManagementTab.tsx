import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemberMetricBreakdown, TeamGroup, TeamMemberProfile } from "../types";
import {
  addMemberToGroup,
  addTeamGroup,
  filterTeams,
  filteredMemberCount,
  flattenTeams,
  groupTeams,
  groupsEqual,
  parseTeamAssignmentsCsv,
  removeMemberFromGroup,
  removeTeamFromGroups,
  renameTeamInGroups,
  teamAssignmentsToCsv,
  updateMemberInGroup,
  validateTeamAssignments,
} from "../lib/teamAssignments";
import { usesFirebaseAdminDraft } from "../lib/adminDraft";
import { saveTeamMap, subscribeTeamMap, usesFirebaseTeamMap } from "../lib/teamMap";
import {
  formatMemberName,
  isTeamLeaderRole,
  parseTeamLeadersCsv,
  sortMembersByProfile,
  teamLeadersToCsv,
  teamLeadersToLookup,
} from "../lib/teamLeaders";
import { saveTeamLeaders, subscribeTeamLeaders, usesFirebaseTeamLeaders } from "../lib/teamLeadersMap";
import {
  parseTeamDiscordCsv,
  teamDiscordToCsv,
} from "../lib/teamDiscord";
import { saveTeamDiscord, subscribeTeamDiscord, usesFirebaseTeamDiscord } from "../lib/teamDiscordMap";
import { fmt1, formatSavedAt, formatUtcDateTime, pct } from "../lib/format";
import { METRICS } from "../lib/metrics.constants";

function formatUpdatedAt(iso: string): string {
  if (!iso) return "—";
  return formatSavedAt(iso);
}

type TeamManagementTabProps = {
  memberMetrics?: Record<string, MemberMetricBreakdown>;
  hasMemberScoringData?: boolean;
  weekLabel?: string;
  focalActivity?: string;
};

const STATUS_LABEL: Record<MemberMetricBreakdown["status"], string> = {
  active: "Active",
  pending: "Pending",
  other: "Other",
  unmapped: "Not in roster",
};

export function TeamManagementTab({
  memberMetrics = {},
  hasMemberScoringData = false,
  weekLabel = "",
  focalActivity = "",
}: TeamManagementTabProps) {
  const [remoteCsv, setRemoteCsv] = useState("");
  const [remoteMeta, setRemoteMeta] = useState<{ updatedAt: string; updatedBy?: string } | null>(null);
  const [leadersCsv, setLeadersCsv] = useState("");
  const [leadersMeta, setLeadersMeta] = useState<{ updatedAt: string; updatedBy?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLeaders, setUploadingLeaders] = useState(false);
  const [discordCsv, setDiscordCsv] = useState("");
  const [discordMeta, setDiscordMeta] = useState<{ updatedAt: string; updatedBy?: string } | null>(null);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [uploadingDiscord, setUploadingDiscord] = useState(false);
  const [draftGroups, setDraftGroups] = useState<TeamGroup[]>([]);
  const [savedGroups, setSavedGroups] = useState<TeamGroup[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");

  const syncFromCsv = useCallback((csv: string) => {
    if (!csv.trim()) {
      setDraftGroups([]);
      setSavedGroups([]);
      return;
    }
    try {
      const rows = parseTeamAssignmentsCsv(csv);
      const groups = groupTeams(rows);
      setDraftGroups(groups);
      setSavedGroups(groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse team assignments.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeTeamMap(
      (data) => {
        const csv = data?.csv ?? "";
        setRemoteCsv(csv);
        setRemoteMeta(data ? { updatedAt: data.updatedAt, updatedBy: data.updatedBy } : null);
        syncFromCsv(csv);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        syncFromCsv("");
        setLoading(false);
      },
    );
    return unsub;
  }, [syncFromCsv]);

  useEffect(() => {
    setLeadersLoading(true);
    const unsub = subscribeTeamLeaders(
      (data) => {
        setLeadersCsv(data?.csv ?? "");
        setLeadersMeta(data ? { updatedAt: data.updatedAt, updatedBy: data.updatedBy } : null);
        setLeadersLoading(false);
      },
      (err) => {
        setError(err.message);
        setLeadersCsv("");
        setLeadersLoading(false);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    setDiscordLoading(true);
    const unsub = subscribeTeamDiscord(
      (data) => {
        setDiscordCsv(data?.csv ?? "");
        setDiscordMeta(data ? { updatedAt: data.updatedAt, updatedBy: data.updatedBy } : null);
        setDiscordLoading(false);
      },
      (err) => {
        setError(err.message);
        setDiscordCsv("");
        setDiscordLoading(false);
      },
    );
    return unsub;
  }, []);

  const discordLinkCount = useMemo(() => {
    if (!discordCsv.trim()) return 0;
    try {
      return parseTeamDiscordCsv(discordCsv).length;
    } catch {
      return 0;
    }
  }, [discordCsv]);

  const memberProfiles = useMemo(() => {
    if (!leadersCsv.trim()) return new Map<string, TeamMemberProfile>();
    try {
      return teamLeadersToLookup(parseTeamLeadersCsv(leadersCsv));
    } catch {
      return new Map<string, TeamMemberProfile>();
    }
  }, [leadersCsv]);

  const dirty = useMemo(() => !groupsEqual(draftGroups, savedGroups), [draftGroups, savedGroups]);

  const visibleTeams = useMemo(
    () => filterTeams(draftGroups, search, memberProfiles),
    [draftGroups, search, memberProfiles],
  );
  const searchActive = Boolean(search.trim());

  const searchSummary = useMemo(() => {
    if (!searchActive) return null;
    const members = filteredMemberCount(visibleTeams);
    return `${visibleTeams.length} team${visibleTeams.length === 1 ? "" : "s"} · ${members} member${members === 1 ? "" : "s"}`;
  }, [searchActive, visibleTeams]);

  const stats = useMemo(() => {
    const members = draftGroups.reduce((n, g) => n + g.members.length, 0);
    return { teams: draftGroups.length, members };
  }, [draftGroups]);

  const flash = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 5000);
  };

  const persistGroups = async (groups: TeamGroup[], successMsg: string) => {
    const rows = flattenTeams(groups);
    const validation = validateTeamAssignments(rows);
    if (validation) throw new Error(validation);
    const csv = teamAssignmentsToCsv(rows);
    setSaving(true);
    setError(null);
    try {
      await saveTeamMap(csv);
      setDraftGroups(groups);
      setSavedGroups(groups);
      setRemoteCsv(csv);
      flash(successMsg);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    try {
      await persistGroups(draftGroups, "Team assignments saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save team assignments.");
    }
  };

  const onDiscard = () => {
    setDraftGroups(savedGroups);
    setError(null);
    flash("Discarded unsaved changes.");
  };

  const onUpload = async (f: File | null) => {
    if (!f || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const text = await f.text();
      const rows = parseTeamAssignmentsCsv(text);
      const groups = groupTeams(rows);
      await persistGroups(
        groups,
        usesFirebaseTeamMap()
          ? "Team map uploaded — all mentors will use this version."
          : "Team map uploaded on this browser.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload team CSV.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadLeaders = async (f: File | null) => {
    if (!f || uploadingLeaders) return;
    setError(null);
    setUploadingLeaders(true);
    try {
      const text = await f.text();
      const rows = parseTeamLeadersCsv(text);
      const csv = teamLeadersToCsv(rows);
      await saveTeamLeaders(csv);
      setLeadersCsv(csv);
      flash(
        usesFirebaseTeamLeaders()
          ? "Team leader profiles uploaded — all mentors will see names and roles."
          : "Team leader profiles saved on this browser.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload team leaders CSV.");
    } finally {
      setUploadingLeaders(false);
    }
  };

  const onDownloadLeaders = () => {
    if (!leadersCsv.trim()) return;
    const blob = new Blob([leadersCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_leaders_assignment.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUploadDiscord = async (f: File | null) => {
    if (!f || uploadingDiscord) return;
    setError(null);
    setUploadingDiscord(true);
    try {
      const text = await f.text();
      const rows = parseTeamDiscordCsv(text);
      if (rows.length === 0) {
        throw new Error("No valid Discord channel URLs found. Use discord.com/channels/… or discord.gg/… links.");
      }
      const csv = teamDiscordToCsv(rows);
      await saveTeamDiscord(csv);
      setDiscordCsv(csv);
      flash(
        usesFirebaseTeamDiscord()
          ? `Discord links uploaded (${rows.length} teams) — visible on My team for all learners.`
          : `Discord links saved on this browser (${rows.length} teams).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload Discord CSV.");
    } finally {
      setUploadingDiscord(false);
    }
  };

  const onDownloadDiscord = () => {
    if (!discordCsv.trim()) return;
    const blob = new Blob([discordCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_discord_channels.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDownload = () => {
    const csv = teamAssignmentsToCsv(flattenTeams(draftGroups));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_assignments_with_names.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const mutate = (fn: (groups: TeamGroup[]) => TeamGroup[]) => {
    setError(null);
    try {
      setDraftGroups(fn(draftGroups));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update teams.");
    }
  };

  const onAddTeam = () => {
    mutate((g) => addTeamGroup(g, newTeamName));
    setNewTeamName("");
  };

  return (
    <div className="space-y-6">
      {error && <div className="tri-alert-error">{error}</div>}
      {message && (
        <div className="rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm text-tri-forest">
          {message}
        </div>
      )}

      <section className="rounded border border-tri-border bg-tri-sand p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-tri-section text-tri-forest">Team assignments</h2>
            <p className="mt-2 max-w-2xl font-body text-tri-lead text-tri-muted">
              Manage cohort teams shared across all mentors. Upload{" "}
              <strong>team_assignments_with_names.csv</strong> (<strong>Email</strong>,{" "}
              <strong>Team_ID</strong>, <strong>Team_Name</strong>), then edit names and members below.
            </p>
            <p className="mt-2 font-body text-tri-nav text-tri-muted">
              {stats.teams} teams · {stats.members} members
              {remoteMeta?.updatedAt ? (
                <>
                  {" "}
                  · Last saved {formatUpdatedAt(remoteMeta.updatedAt)}
                  {remoteMeta.updatedBy ? ` · ${remoteMeta.updatedBy}` : ""}
                </>
              ) : null}
              {!remoteCsv.trim() && !loading ? " · No team map saved yet" : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="tri-btn-muted cursor-pointer">
              {uploading ? "Uploading…" : "Upload CSV"}
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                disabled={uploading || loading}
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="button" className="tri-btn-muted" onClick={onDownload} disabled={!draftGroups.length}>
              Download CSV
            </button>
            {dirty && (
              <>
                <button type="button" className="tri-btn-muted" onClick={onDiscard} disabled={saving}>
                  Discard
                </button>
                <button type="button" className="tri-btn-primary" onClick={() => void onSave()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <input
            type="search"
            className="w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav sm:max-w-md"
            placeholder="Search team, email, name, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchSummary ? (
            <p className="mt-2 font-body text-xs text-tri-muted">{searchSummary} matching</p>
          ) : null}
        </div>
      </section>

      <section className="rounded border border-tri-border bg-tri-sand p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-tri-section text-tri-forest">Team leaders & member profiles</h2>
            <p className="mt-2 max-w-2xl font-body text-tri-lead text-tri-muted">
              Upload <strong>team_leaders_assignment.csv</strong> to show each learner&apos;s name, role (Team Leader
              1/2 or Member), and leader qualification scores in the member tables below. Team assignments above
              still control who is on each team.
            </p>
            <p className="mt-2 font-body text-tri-nav text-tri-muted">
              {memberProfiles.size} profiles loaded
              {leadersMeta?.updatedAt ? (
                <>
                  {" "}
                  · Last saved {formatUpdatedAt(leadersMeta.updatedAt)}
                  {leadersMeta.updatedBy ? ` · ${leadersMeta.updatedBy}` : ""}
                </>
              ) : null}
              {!leadersCsv.trim() && !leadersLoading ? " · No leader profiles saved yet" : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="tri-btn-muted cursor-pointer">
              {uploadingLeaders ? "Uploading…" : "Upload leaders CSV"}
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                disabled={uploadingLeaders || leadersLoading}
                onChange={(e) => void onUploadLeaders(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              className="tri-btn-muted"
              onClick={onDownloadLeaders}
              disabled={!leadersCsv.trim()}
            >
              Download leaders CSV
            </button>
          </div>
        </div>
      </section>

      <section className="rounded border border-tri-border bg-tri-sand p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-tri-section text-tri-forest">Team Discord channels</h2>
            <p className="mt-2 max-w-2xl font-body text-tri-lead text-tri-muted">
              Upload <strong>team_discord_channels.csv</strong> with each team&apos;s Discord channel link. Learners
              see an <strong>Open channel</strong> button on <strong>My team</strong> for their assigned team.
            </p>
            <p className="mt-2 font-body text-tri-nav text-tri-muted">
              {discordLinkCount} channel link{discordLinkCount === 1 ? "" : "s"} loaded
              {discordMeta?.updatedAt ? (
                <>
                  {" "}
                  · Last saved {formatUpdatedAt(discordMeta.updatedAt)}
                  {discordMeta.updatedBy ? ` · ${discordMeta.updatedBy}` : ""}
                </>
              ) : null}
              {!discordCsv.trim() && !discordLoading ? " · No Discord links saved yet" : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="tri-btn-muted cursor-pointer">
              {uploadingDiscord ? "Uploading…" : "Upload Discord CSV"}
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                disabled={uploadingDiscord || discordLoading}
                onChange={(e) => void onUploadDiscord(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              className="tri-btn-muted"
              onClick={onDownloadDiscord}
              disabled={!discordCsv.trim()}
            >
              Download Discord CSV
            </button>
          </div>
        </div>
      </section>

      {hasMemberScoringData ? (
        <section className="rounded border border-tri-border bg-tri-mist px-4 py-3 font-body text-sm text-tri-muted">
          <strong className="text-tri-ink">Member metrics</strong> for{" "}
          <span className="font-medium text-tri-ink">{weekLabel}</span>
          {focalActivity ? (
            <>
              {" "}
              · focal course: <span className="font-medium text-tri-ink">{focalActivity}</span>
            </>
          ) : null}
          . Upload activity CSV on the Scoreboard tab to refresh. Effort cap:{" "}
          {METRICS.effort.expectedWeeklyMinutesPerMember} min per member.
        </section>
      ) : (
        <section className="rounded border border-dashed border-tri-border bg-tri-mist/50 px-4 py-3 font-body text-sm text-tri-muted">
          Upload <strong className="text-tri-ink">activity CSV</strong> on the Scoreboard tab to see per-member
          participation, completion, quiz, and learning time here.
          {usesFirebaseAdminDraft()
            ? " The latest upload is shared via Firebase for all admins."
            : null}
        </section>
      )}

      <section className="rounded border border-tri-border bg-tri-sand p-6 shadow-card">
        <h3 className="font-display text-xl text-tri-forest">Add team</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 font-body text-tri-nav">
            <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Team name</span>
            <input
              className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
              placeholder="e.g. Nyamuragira"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </label>
          <button type="button" className="tri-btn-muted shrink-0" onClick={onAddTeam}>
            Add team
          </button>
        </div>
      </section>

      {loading ? (
        <p className="py-10 text-center font-body text-tri-nav text-tri-muted">Loading team assignments…</p>
      ) : visibleTeams.length === 0 ? (
        <p className="rounded border border-dashed border-tri-border bg-tri-mist/50 py-10 text-center font-body text-tri-nav text-tri-muted">
          {draftGroups.length === 0
            ? "No teams yet. Upload a CSV or add a team above."
            : "No teams or members match your search."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleTeams.map((team) => (
            <TeamCard
              key={team.teamId}
              team={team}
              searchActive={searchActive}
              fullMemberCount={
                searchActive
                  ? draftGroups.find((g) => g.teamId === team.teamId)?.members.length
                  : undefined
              }
              memberMetrics={memberMetrics}
              memberProfiles={memberProfiles}
              showMemberMetrics={hasMemberScoringData}
              onRename={(name) => mutate((g) => renameTeamInGroups(g, team.teamId, name))}
              onRemoveTeam={() => {
                if (!window.confirm(`Remove team "${team.teamName}" and all ${team.members.length} members?`)) {
                  return;
                }
                mutate((g) => removeTeamFromGroups(g, team.teamId));
              }}
              onAddMember={(email) => mutate((g) => addMemberToGroup(g, team.teamId, email))}
              onRemoveMember={(email) => mutate((g) => removeMemberFromGroup(g, team.teamId, email))}
              onUpdateMember={(oldEmail, newEmail) =>
                mutate((g) => updateMemberInGroup(g, team.teamId, oldEmail, newEmail))
              }
            />
          ))}
        </ul>
      )}

      {dirty && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-tri border border-tri-orange/40 bg-tri-chrome px-4 py-3 shadow-tri">
          <p className="font-body text-sm text-tri-muted">You have unsaved team changes.</p>
          <div className="flex gap-2">
            <button type="button" className="tri-btn-muted py-2" onClick={onDiscard} disabled={saving}>
              Discard
            </button>
            <button type="button" className="tri-btn-primary py-2" onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team,
  searchActive,
  fullMemberCount,
  memberMetrics,
  memberProfiles,
  showMemberMetrics,
  onRename,
  onRemoveTeam,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
}: {
  team: TeamGroup;
  searchActive?: boolean;
  /** When search narrows members, total roster size on the full team. */
  fullMemberCount?: number;
  memberMetrics: Record<string, MemberMetricBreakdown>;
  memberProfiles: Map<string, TeamMemberProfile>;
  showMemberMetrics: boolean;
  onRename: (name: string) => void;
  onRemoveTeam: () => void;
  onAddMember: (email: string) => void;
  onRemoveMember: (email: string) => void;
  onUpdateMember: (oldEmail: string, newEmail: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(team.teamName);
  const [newEmail, setNewEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    if (!editingName) setNameDraft(team.teamName);
  }, [team.teamName, editingName]);

  const commitRename = () => {
    onRename(nameDraft);
    setEditingName(false);
  };

  const commitEmailEdit = () => {
    if (editingEmail) {
      onUpdateMember(editingEmail, emailDraft);
      setEditingEmail(null);
      setEmailDraft("");
    }
  };

  const sortedMembers = useMemo(
    () => sortMembersByProfile(team.members, memberProfiles),
    [team.members, memberProfiles],
  );

  const leaderSummary = useMemo(() => {
    return sortedMembers
      .map((email) => memberProfiles.get(email))
      .filter((p): p is TeamMemberProfile => Boolean(p && isTeamLeaderRole(p.role)))
      .map((p) => `${formatMemberName(p) || p.email} (${p.role})`)
      .join(" · ");
  }, [sortedMembers, memberProfiles]);

  return (
    <li className="overflow-hidden rounded-tri border border-tri-border bg-tri-surface shadow-card">
      <details className="group" open={searchActive || undefined}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-tri-mist/60 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-tri-leaf/15 font-display text-sm font-bold text-tri-forest">
            {team.teamId}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-tri-forest">{team.teamName}</p>
            <p className="font-body text-xs text-tri-muted">
              {fullMemberCount != null && fullMemberCount !== team.members.length
                ? `${team.members.length} of ${fullMemberCount} members match`
                : `${team.members.length} member${team.members.length === 1 ? "" : "s"}`}
              {leaderSummary ? (
                <>
                  {" "}
                  · <span className="text-tri-ink">{leaderSummary}</span>
                </>
              ) : null}
            </p>
          </div>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-tri-border text-tri-muted transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </summary>

        <div className="border-t border-tri-border bg-tri-mist/30 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex-1 font-body text-tri-nav">
              <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Team name</span>
              {editingName ? (
                <div className="mt-1 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border border-tri-border-md bg-tri-sand px-3 py-2 text-sm"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        setNameDraft(team.teamName);
                        setEditingName(false);
                      }
                    }}
                    autoFocus
                  />
                  <button type="button" className="tri-btn-muted py-2 text-xs" onClick={commitRename}>
                    Done
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-medium text-tri-ink">{team.teamName}</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-tri-orange hover:text-tri-leaf"
                    onClick={() => setEditingName(true)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </label>
            <button type="button" className="tri-btn-muted py-2 text-xs text-red-800" onClick={onRemoveTeam}>
              Delete team
            </button>
          </div>

          {team.members.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded border border-tri-border bg-tri-surface">
              {showMemberMetrics ? (
                <table className="w-full min-w-[920px] border-collapse font-body text-sm">
                  <thead>
                    <tr className="border-b border-tri-border bg-tri-mist/50 text-left text-[10px] font-bold uppercase tracking-wide text-tri-faint">
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Last active</th>
                      <th className="px-3 py-2">Participated</th>
                      <th className="px-3 py-2">Completed</th>
                      <th className="px-3 py-2">Quiz</th>
                      <th className="px-3 py-2">Learning</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sortedMembers.map((email) => (
                      <MemberRow
                        key={email}
                        email={email}
                        profile={memberProfiles.get(email)}
                        metric={memberMetrics[email]}
                        showMetrics
                        editingEmail={editingEmail}
                        emailDraft={emailDraft}
                        onStartEdit={() => {
                          setEditingEmail(email);
                          setEmailDraft(email);
                        }}
                        onEmailDraftChange={setEmailDraft}
                        onCommitEdit={commitEmailEdit}
                        onCancelEdit={() => setEditingEmail(null)}
                        onRemove={() => {
                          if (window.confirm(`Remove ${email} from ${team.teamName}?`)) onRemoveMember(email);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {sortedMembers.map((email) => (
                    <MemberRow
                      key={email}
                      email={email}
                      profile={memberProfiles.get(email)}
                      editingEmail={editingEmail}
                      emailDraft={emailDraft}
                      onStartEdit={() => {
                        setEditingEmail(email);
                        setEmailDraft(email);
                      }}
                      onEmailDraftChange={setEmailDraft}
                      onCommitEdit={commitEmailEdit}
                      onCancelEdit={() => setEditingEmail(null)}
                      onRemove={() => {
                        if (window.confirm(`Remove ${email} from ${team.teamName}?`)) onRemoveMember(email);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-4 font-body text-sm text-tri-muted">No members yet — add an email below.</p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 font-body text-tri-nav">
              <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">Add member email</span>
              <input
                type="email"
                className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 text-sm"
                placeholder="learner@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newEmail.trim()) {
                    onAddMember(newEmail);
                    setNewEmail("");
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="tri-btn-muted shrink-0 py-2"
              onClick={() => {
                onAddMember(newEmail);
                setNewEmail("");
              }}
              disabled={!newEmail.trim()}
            >
              Add to team
            </button>
          </div>
        </div>
      </details>
    </li>
  );
}

function MemberRow({
  email,
  profile,
  metric,
  showMetrics = false,
  editingEmail,
  emailDraft,
  onStartEdit,
  onEmailDraftChange,
  onCommitEdit,
  onCancelEdit,
  onRemove,
}: {
  email: string;
  profile?: TeamMemberProfile;
  metric?: MemberMetricBreakdown;
  showMetrics?: boolean;
  editingEmail: string | null;
  emailDraft: string;
  onStartEdit: () => void;
  onEmailDraftChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}) {
  const editing = editingEmail === email;
  const displayName = formatMemberName(profile);
  const role = profile?.role?.trim() ?? "";

  const actions = (
    <div className="flex shrink-0 justify-end gap-2">
      {!editing && (
        <button
          type="button"
          className="text-xs font-semibold text-tri-orange hover:text-tri-leaf"
          onClick={onStartEdit}
        >
          Edit
        </button>
      )}
      <button type="button" className="text-xs font-semibold text-red-800 hover:underline" onClick={onRemove}>
        Remove
      </button>
    </div>
  );

  if (showMetrics) {
    return (
      <tr className="text-tri-ink">
        <td className="max-w-[12rem] truncate px-3 py-2">
          {editing ? (
            <input
              className="w-full min-w-0 rounded border border-tri-border-md bg-tri-sand px-2 py-1 text-sm"
              value={emailDraft}
              onChange={(e) => onEmailDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
          ) : (
            <span title={email}>{email}</span>
          )}
        </td>
        <td className="max-w-[10rem] truncate px-3 py-2 text-tri-ink" title={displayName || undefined}>
          {displayName || <span className="text-tri-muted">—</span>}
        </td>
        <td className="px-3 py-2">
          {role ? <MemberRoleBadge role={role} /> : <span className="text-tri-muted">—</span>}
        </td>
        <td className="px-3 py-2">
          {metric ? (
            <MemberStatusBadge status={metric.status} />
          ) : (
            <span className="text-tri-muted">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-tri-muted">
          {formatUtcDateTime(metric?.lastActive ?? null)}
        </td>
        <td className="px-3 py-2">
          <MetricYesNo value={metric?.participated} />
        </td>
        <td className="px-3 py-2">
          <MetricYesNo value={metric?.completed} />
        </td>
        <td className="px-3 py-2 text-tri-muted">
          {metric?.bestQuiz != null ? pct(metric.bestQuiz) : "—"}
        </td>
        <td className="px-3 py-2 text-tri-muted">
          {metric ? `${fmt1(metric.learningMinutes)} min` : "—"}
        </td>
        <td className="px-3 py-2">{actions}</td>
      </tr>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-tri-border-md bg-tri-sand px-2 py-1.5 text-sm"
              value={emailDraft}
              onChange={(e) => onEmailDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
            <button type="button" className="tri-btn-muted py-1.5 text-xs" onClick={onCommitEdit}>
              Save
            </button>
            <button type="button" className="tri-btn-muted py-1.5 text-xs" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <p className="truncate font-body text-sm text-tri-ink" title={email}>
              {email}
            </p>
            {(displayName || role) && (
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-tri-muted">
                {displayName ? <span className="text-tri-ink">{displayName}</span> : null}
                {role ? <MemberRoleBadge role={role} /> : null}
              </p>
            )}
          </>
        )}
      </div>
      {!editing && actions}
    </li>
  );
}

function MemberRoleBadge({ role }: { role: string }) {
  const leader = isTeamLeaderRole(role);
  return (
    <span
      className={
        leader
          ? "inline-flex rounded-full bg-tri-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tri-orange"
          : "inline-flex rounded-full bg-tri-mist px-2 py-0.5 text-[10px] font-semibold text-tri-muted"
      }
    >
      {role}
    </span>
  );
}

function MemberStatusBadge({ status }: { status: MemberMetricBreakdown["status"] }) {
  const tone =
    status === "active"
      ? "bg-tri-leaf/15 text-tri-forest"
      : status === "pending"
        ? "bg-tri-orange-dim text-tri-orange"
        : "bg-tri-mist text-tri-muted";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function MetricYesNo({ value }: { value?: boolean }) {
  if (value === undefined) return <span className="text-tri-muted">—</span>;
  return (
    <span className={value ? "font-medium text-tri-forest" : "text-tri-muted"}>{value ? "Yes" : "No"}</span>
  );
}
