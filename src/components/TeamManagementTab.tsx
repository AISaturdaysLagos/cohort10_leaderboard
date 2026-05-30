import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamGroup } from "../types";
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
import { saveTeamMap, subscribeTeamMap, usesFirebaseTeamMap } from "../lib/teamMap";
import { formatSavedAt } from "../lib/format";

function formatUpdatedAt(iso: string): string {
  if (!iso) return "—";
  return formatSavedAt(iso);
}

export function TeamManagementTab() {
  const [remoteCsv, setRemoteCsv] = useState("");
  const [remoteMeta, setRemoteMeta] = useState<{ updatedAt: string; updatedBy?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const dirty = useMemo(() => !groupsEqual(draftGroups, savedGroups), [draftGroups, savedGroups]);

  const visibleTeams = useMemo(() => filterTeams(draftGroups, search), [draftGroups, search]);
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
            placeholder="Search team name, ID, or member email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchSummary ? (
            <p className="mt-2 font-body text-xs text-tri-muted">{searchSummary} matching</p>
          ) : null}
        </div>
      </section>

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
            <ul className="mt-4 divide-y divide-[var(--border)] rounded border border-tri-border bg-tri-surface">
              {team.members.map((email) => (
                <li key={email} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  {editingEmail === email ? (
                    <div className="flex min-w-0 flex-1 gap-2">
                      <input
                        className="min-w-0 flex-1 rounded border border-tri-border-md bg-tri-sand px-2 py-1.5 text-sm"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEmailEdit();
                          if (e.key === "Escape") setEditingEmail(null);
                        }}
                        autoFocus
                      />
                      <button type="button" className="tri-btn-muted py-1.5 text-xs" onClick={commitEmailEdit}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <span className="min-w-0 truncate font-body text-sm text-tri-ink">{email}</span>
                  )}
                  <div className="flex shrink-0 gap-2">
                    {editingEmail !== email && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-tri-orange hover:text-tri-leaf"
                        onClick={() => {
                          setEditingEmail(email);
                          setEmailDraft(email);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-800 hover:underline"
                      onClick={() => {
                        if (window.confirm(`Remove ${email} from ${team.teamName}?`)) onRemoveMember(email);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
