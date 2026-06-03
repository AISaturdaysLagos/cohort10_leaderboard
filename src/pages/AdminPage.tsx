import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Link } from "react-router-dom";
import type { WeekBounds } from "../types";
import {
  activityDateExtent,
  formatWeekLabel,
  inferDefaultWeekMondayFromData,
  listUtcWeekMondaysBetween,
  utcMondayIsoFromDate,
  weekBoundsFromMondayIso,
} from "../lib/dates";
import { parseActivityCsv, parseRosterCsv, parseTeamLookupCsv, applyTeamMapToRoster, filterActivityByTeamMap } from "../lib/parseCsv";
import {
  computeTeamMetrics,
  computeWeeklyAwards,
  computeMemberMetrics,
  METRIC_DEFINITIONS,
  METRICS,
} from "../lib/metrics.js";
import {
  inferDominantParent,
  inferDominantParentGlobal,
  inferFocalCourse,
  listFocalCourseOptions,
  listParentLearningPaths,
  snapshotId,
} from "../lib/scoring";
import { MentorLeaderboardTable } from "../components/MentorLeaderboardTable";
import { WeekPicker } from "../components/WeekPicker";
import {
  deleteHistoryEntry,
  saveHistoryEntry,
  subscribeHistory,
  usesFirebaseHistory,
  type HistoryEntry,
} from "../lib/history";
import { clearPublishedBoard, savePublishedBoard, usesFirebasePublished } from "../lib/published";
import { fmt1, formatAwardTeams, formatSavedAt } from "../lib/format";
import { activityImportSummary, rosterImportSummary, teamLookupSummary } from "../lib/importSummary";
import { useLatestCourseDate } from "../hooks/useLatestCourseDate";
import { subscribeTeamMap, usesFirebaseTeamMap } from "../lib/teamMap";
import { TeamManagementTab } from "../components/TeamManagementTab";
import { LEAGUE_NAME, LEARNERS_LABEL } from "../lib/triAiBrand";
import {
  loadAdminDraft,
  saveAdminDraft,
  subscribeAdminDraft,
  isRemoteDraftNewer,
  usesFirebaseAdminDraft,
} from "../lib/adminDraft";

type AdminTab = "scoreboard" | "teams";

function readInitialAdminDraft() {
  return loadAdminDraft();
}

export function AdminPage() {
  const initialDraftRef = useRef(readInitialAdminDraft());
  const [adminTab, setAdminTab] = useState<AdminTab>("scoreboard");
  const [activityText, setActivityText] = useState(() => initialDraftRef.current.activityCsv);
  const [rosterText, setRosterText] = useState(() => initialDraftRef.current.rosterCsv);
  const [activityFileName, setActivityFileName] = useState(() => initialDraftRef.current.activityFileName);
  const [rosterFileName, setRosterFileName] = useState(() => initialDraftRef.current.rosterFileName);
  const [error, setError] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [clearingPublished, setClearingPublished] = useState(false);
  const [weekMondayIso, setWeekMondayIso] = useState(() => initialDraftRef.current.weekMondayIso);
  const [parentOverride, setParentOverride] = useState(() => initialDraftRef.current.parentOverride);
  const [focalOverride, setFocalOverride] = useState(() => initialDraftRef.current.focalOverride);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [compareId, setCompareId] = useState<string>("");
  const [viewHistoryId, setViewHistoryId] = useState<string>("");
  const [remoteTeamMapCsv, setRemoteTeamMapCsv] = useState("");
  const [teamMapLoading, setTeamMapLoading] = useState(true);
  const [adminDraftLoading, setAdminDraftLoading] = useState(() => usesFirebaseAdminDraft());
  const deferredActivityText = useDeferredValue(activityText);
  const deferredRosterText = useDeferredValue(rosterText);
  const deferredRemoteTeamMapCsv = useDeferredValue(remoteTeamMapCsv);
  const activityWeekSyncedRef = useRef(
    `${initialDraftRef.current.activityCsv}\0${initialDraftRef.current.rosterCsv}`,
  );

  useEffect(() => {
    saveAdminDraft({
      activityCsv: activityText,
      rosterCsv: rosterText,
      activityFileName,
      rosterFileName,
      weekMondayIso,
      parentOverride,
      focalOverride,
    });
  }, [activityText, rosterText, activityFileName, rosterFileName, weekMondayIso, parentOverride, focalOverride]);

  useEffect(() => {
    return subscribeAdminDraft(
      (remote) => {
        setAdminDraftLoading(false);
        if (!remote) return;
        const local = loadAdminDraft();
        if (!isRemoteDraftNewer(remote, local)) return;
        setActivityText(remote.activityCsv);
        setRosterText(remote.rosterCsv);
        setActivityFileName(remote.activityFileName);
        setRosterFileName(remote.rosterFileName);
        setWeekMondayIso(remote.weekMondayIso);
        setParentOverride(remote.parentOverride);
        setFocalOverride(remote.focalOverride);
        activityWeekSyncedRef.current = `${remote.activityCsv}\0${remote.rosterCsv}`;
      },
      (err) => {
        setAdminDraftLoading(false);
        setError(err.message);
      },
    );
  }, []);

  const adminDraftSource = usesFirebaseAdminDraft()
    ? "shared Firebase admin draft"
    : "saved on this browser";

  const allActivityRows = useMemo(() => {
    if (!deferredActivityText.trim()) return [];
    try {
      return parseActivityCsv(deferredActivityText);
    } catch {
      return [];
    }
  }, [deferredActivityText]);

  const teamMapCsv = useMemo(() => {
    if (deferredRemoteTeamMapCsv.trim()) return deferredRemoteTeamMapCsv;
    return "";
  }, [deferredRemoteTeamMapCsv]);

  const teamLookup = useMemo(() => {
    if (!teamMapCsv.trim()) return new Map<string, string>();
    try {
      return parseTeamLookupCsv(teamMapCsv);
    } catch {
      return new Map<string, string>();
    }
  }, [teamMapCsv]);

  const teamMapSource = useMemo(() => {
    if (deferredRemoteTeamMapCsv.trim()) {
      return usesFirebaseTeamMap() ? "shared Firebase team map" : "saved team map";
    }
    if (teamMapLoading) return "loading team map…";
    return "no team map — upload on Team management tab";
  }, [deferredRemoteTeamMapCsv, teamMapLoading]);

  const roster = useMemo(() => {
    if (!deferredRosterText.trim() || !teamLookup.size) return [];
    try {
      const base = parseRosterCsv(deferredRosterText);
      return applyTeamMapToRoster(base, teamLookup);
    } catch {
      return [];
    }
  }, [deferredRosterText, teamLookup]);

  const rosterExcludedCount = useMemo(() => {
    if (!deferredRosterText.trim() || !teamLookup.size) return 0;
    try {
      const base = parseRosterCsv(deferredRosterText);
      return base.filter((r) => !teamLookup.has(r.email)).length;
    } catch {
      return 0;
    }
  }, [deferredRosterText, teamLookup]);

  const inferredWeekMonday = useMemo(
    () => inferDefaultWeekMondayFromData(allActivityRows, roster),
    [allActivityRows, roster],
  );

  const effectiveWeekMondayIso =
    weekMondayIso || inferredWeekMonday || utcMondayIsoFromDate(new Date());

  useEffect(() => {
    if (!deferredActivityText.trim() && !deferredRosterText.trim()) {
      activityWeekSyncedRef.current = "";
      return;
    }
    const syncKey = `${deferredActivityText}\0${deferredRosterText}`;
    if (activityWeekSyncedRef.current === syncKey) return;
    activityWeekSyncedRef.current = syncKey;
    const monday = inferDefaultWeekMondayFromData(allActivityRows, roster);
    if (monday) {
      setWeekMondayIso(monday);
      setFocalOverride("");
      setParentOverride("");
    }
  }, [deferredActivityText, deferredRosterText, allActivityRows, roster]);

  const rows = useMemo(
    () => filterActivityByTeamMap(allActivityRows, teamLookup),
    [allActivityRows, teamLookup],
  );

  const activityExcludedCount = useMemo(() => {
    if (!teamLookup.size) return allActivityRows.length;
    return allActivityRows.filter((r) => !teamLookup.has(r.member)).length;
  }, [allActivityRows, teamLookup]);

  const isParsing =
    activityText !== deferredActivityText ||
    rosterText !== deferredRosterText ||
    remoteTeamMapCsv !== deferredRemoteTeamMapCsv;

  const teamSummary = useMemo(() => {
    const base = teamLookupSummary(teamLookup);
    if (!base) return teamMapLoading ? "Loading team assignments…" : "";
    return `${base} · ${teamMapSource}`;
  }, [teamLookup, teamMapSource, teamMapLoading]);

  const week: WeekBounds = useMemo(
    () => weekBoundsFromMondayIso(effectiveWeekMondayIso),
    [effectiveWeekMondayIso],
  );

  const weekMondayOptions = useMemo(() => {
    const extent = activityDateExtent(allActivityRows);
    if (!extent) return [];
    return listUtcWeekMondaysBetween(extent.min, extent.max).reverse();
  }, [allActivityRows]);

  const latestCourseDate = useLatestCourseDate(allActivityRows);

  const inferredParentWeek = useMemo(
    () => (allActivityRows.length ? inferDominantParent(allActivityRows, week) : null),
    [allActivityRows, week],
  );
  const inferredParentGlobal = useMemo(
    () => (allActivityRows.length ? inferDominantParentGlobal(allActivityRows) : null),
    [allActivityRows],
  );

  const parentName = useMemo(() => {
    const o = parentOverride.trim();
    if (o) return o;
    return inferredParentWeek ?? inferredParentGlobal;
  }, [parentOverride, inferredParentWeek, inferredParentGlobal]);

  const parentOptions = useMemo(
    () => listParentLearningPaths(allActivityRows),
    [allActivityRows],
  );

  const inferredFocal = useMemo(() => {
    if (!allActivityRows.length) return null;
    return inferFocalCourse(allActivityRows, week, parentName ?? null);
  }, [allActivityRows, week, parentName]);

  const focalActivity = useMemo(() => {
    const o = focalOverride.trim();
    if (o) return o;
    return inferredFocal ?? "";
  }, [focalOverride, inferredFocal]);

  const courseOptions = useMemo(
    () => listFocalCourseOptions(allActivityRows, week, parentName ?? null),
    [allActivityRows, week, parentName],
  );

  const activitySummary = useMemo(
    () => activityImportSummary(rows, activityExcludedCount),
    [rows, activityExcludedCount],
  );
  const rosterSummary = useMemo(
    () => rosterImportSummary(roster, rosterExcludedCount),
    [roster, rosterExcludedCount],
  );

  const metrics = useMemo(() => {
    if (!rows.length || !roster.length || !focalActivity) return [];
    try {
      return computeTeamMetrics(rows, roster, week, focalActivity);
    } catch {
      return [];
    }
  }, [rows, roster, week, focalActivity]);

  const memberMetrics = useMemo(() => {
    if (!focalActivity || !rows.length) return {};
    const extraEmails = [...teamLookup.entries()].map(([email, teamName]) => ({ email, teamName }));
    try {
      return computeMemberMetrics(rows, roster, week, focalActivity, extraEmails);
    } catch {
      return {};
    }
  }, [rows, roster, week, focalActivity, teamLookup]);

  const hasMemberScoringData = Boolean(focalActivity && rows.length);

  const previousMetrics = useMemo(() => {
    if (!compareId) return null;
    const e = history.find((h) => h.id === compareId);
    return e?.metrics ?? null;
  }, [compareId, history]);

  const awards = useMemo(
    () => computeWeeklyAwards(metrics, previousMetrics),
    [metrics, previousMetrics],
  );

  const weekLabel = useMemo(() => formatWeekLabel(week), [week]);
  const currentSnapshotId = useMemo(
    () => (focalActivity ? snapshotId(week, focalActivity) : ""),
    [week, focalActivity],
  );

  const viewedSnapshot = useMemo(
    () => history.find((h) => h.id === viewHistoryId) ?? null,
    [history, viewHistoryId],
  );

  const removeSnapshot = async (id: string) => {
    if (!window.confirm("Remove this saved snapshot from history?")) return;
    setError(null);
    try {
      await deleteHistoryEntry(id);
      if (viewHistoryId === id) setViewHistoryId("");
      if (compareId === id) setCompareId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the snapshot.");
    }
  };

  useEffect(() => {
    setHistoryLoading(true);
    const unsub = subscribeHistory(
      (entries) => {
        setHistory(entries);
        setHistoryLoading(false);
      },
      (err) => {
        setError(err.message);
        setHistoryLoading(false);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    setTeamMapLoading(true);
    const unsub = subscribeTeamMap(
      (data) => {
        setRemoteTeamMapCsv(data?.csv ?? "");
        setTeamMapLoading(false);
      },
      (err) => {
        setError(err.message);
        setTeamMapLoading(false);
      },
    );
    return unsub;
  }, []);

  const onActivityFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    const t = await f.text();
    setActivityText(t);
    setActivityFileName(f.name);
    saveAdminDraft({ activityCsv: t, activityFileName: f.name }, { immediate: true });
    try {
      parseActivityCsv(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid activity CSV");
    }
  };

  const onRosterFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    try {
      const text = await f.text();
      setRosterText(text);
      setRosterFileName(f.name);
      saveAdminDraft({ rosterCsv: text, rosterFileName: f.name }, { immediate: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid roster CSV");
    }
  };

  const saveWeek = async () => {
    if (!focalActivity || !metrics.length || savingSnapshot) return;
    const id = snapshotId(week, focalActivity);
    const entry: HistoryEntry = {
      id,
      weekLabel,
      focalActivity,
      metrics,
      savedAt: new Date().toISOString(),
    };
    setError(null);
    setSavingSnapshot(true);
    try {
      await saveHistoryEntry(entry);
      setViewHistoryId(id);
      setPublishMsg(
        usesFirebaseHistory()
          ? "Snapshot saved — all signed-in mentors can see it."
          : "Snapshot saved on this browser.",
      );
      window.setTimeout(() => setPublishMsg(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the snapshot.");
    } finally {
      setSavingSnapshot(false);
    }
  };

  const publishToStudents = async () => {
    if (!focalActivity || !metrics.length || publishing) return;
    setError(null);
    setPublishing(true);
    try {
      await savePublishedBoard({ weekLabel, focalActivity, metrics, awards });
      setPublishMsg(
        usesFirebasePublished()
          ? "Published to Firebase — all students on the live site can see this board."
          : "Saved locally — students on this browser can see this board.",
      );
      window.setTimeout(() => setPublishMsg(null), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the leaderboard.");
    } finally {
      setPublishing(false);
    }
  };

  const clearPublishedFromStudents = async () => {
    if (clearingPublished) return;
    if (
      !window.confirm(
        usesFirebasePublished()
          ? "Remove the published leaderboard from Firebase? Students will see “Leaderboard coming soon” until you publish again."
          : "Remove the published leaderboard from this browser?",
      )
    ) {
      return;
    }
    setError(null);
    setClearingPublished(true);
    try {
      await clearPublishedBoard();
      setPublishMsg(
        usesFirebasePublished()
          ? "Published board cleared from Firebase."
          : "Published board cleared from this browser.",
      );
      window.setTimeout(() => setPublishMsg(null), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear the published leaderboard.");
    } finally {
      setClearingPublished(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative shrink-0 overflow-hidden border-b border-tri-border bg-tri-chrome transition-colors">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(254,102,18,0.08)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-12">
          <div>
            <p className="text-xs text-tri-faint">Admin · {LEAGUE_NAME}</p>
            <span className="tri-hero-tag mt-4">
              {adminTab === "teams" ? "Team management" : "Scoreboard controls"}
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-tri-ink sm:text-tri-hero">
              {adminTab === "teams" ? "Team management" : "Weekly scoreboard controls"}
            </h1>
            <p className="mt-4 max-w-xl font-body text-tri-lead text-tri-muted">
              {adminTab === "teams" ? (
                <>
                  Upload and edit cohort team assignments shared across mentors. Changes save to Firebase for
                  the scoreboard.
                </>
              ) : (
                <>
                  Upload Skills Boost exports, tune the week and focal course, then{" "}
                  <strong>publish</strong> so {LEARNERS_LABEL} only see the curated student view — no raw
                  CSVs or roster emails.
                </>
              )}
            </p>
            <div className="tri-hero-rule" />
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
              <button
                type="button"
                className={
                  adminTab === "scoreboard"
                    ? "tri-btn-primary py-2"
                    : "tri-btn-outline-panel py-2"
                }
                onClick={() => setAdminTab("scoreboard")}
              >
                Scoreboard
              </button>
              <button
                type="button"
                className={
                  adminTab === "teams" ? "tri-btn-primary py-2" : "tri-btn-outline-panel py-2"
                }
                onClick={() => setAdminTab("teams")}
              >
                Team management
              </button>
            </nav>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="tri-btn-primary" to="/leaderboard">
                Open student view
              </Link>
              <a
                className="tri-btn-outline-panel"
                href="https://aisaturdayslagos.github.io/cohort_structure/cohort10/"
                target="_blank"
                rel="noreferrer"
              >
                Cohort 10 programme
              </a>
            </div>
          </div>
          <div className="rounded-tri border border-tri-border bg-tri-mist p-5 sm:max-w-xs">
            <p className="font-nav text-xs font-semibold uppercase tracking-wide text-tri-faint">Draft week</p>
            <p className="mt-1 font-display text-2xl font-bold text-tri-ink">{weekLabel}</p>
            {latestCourseDate && (
              <p className="mt-2 font-body text-tri-nav text-tri-muted">
                Latest course activity (UTC): {latestCourseDate.toISOString().slice(0, 10)}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-10">
        {adminTab === "teams" ? (
          <TeamManagementTab
            memberMetrics={memberMetrics}
            hasMemberScoringData={hasMemberScoringData}
            weekLabel={weekLabel}
            focalActivity={focalActivity}
          />
        ) : (
          <>
        {publishMsg && (
          <div className="rounded border border-tri-leaf/40 bg-tri-mist px-4 py-3 font-body text-tri-nav text-tri-forest">
            {publishMsg}
          </div>
        )}
        {error && (
          <div className="rounded border tri-alert-error">
            {error}
          </div>
        )}
        {isParsing && (
          <div className="rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm text-tri-forest">
            Processing uploaded CSV data…
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded border border-tri-border bg-tri-sand p-6 shadow-card lg:col-span-2">
            <h2 className="font-display text-tri-section text-tri-forest">Data & week scope</h2>
            <p className="mt-3 font-body text-tri-lead text-tri-muted">
              Each week: upload the <strong>activity</strong> export from Skills Boost, then the{" "}
              <strong>roster or program members</strong> export (emails, Active/Pending, last active — these files do{" "}
              <strong>not</strong> include team names). Only {LEARNERS_LABEL} listed in the shared team map
              are scored — everyone else is excluded (no default team). Manage assignments on the{" "}
              <button
                type="button"
                className="font-semibold text-tri-orange underline-offset-2 hover:underline"
                onClick={() => setAdminTab("teams")}
              >
                Team management
              </button>{" "}
              tab. Uploads and previews are saved to <strong>{adminDraftSource}</strong>
              {adminDraftLoading ? " (loading…)" : ""} so all admins see the same files and member metrics.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">
                  Activity CSV
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => void onActivityFile(e.target.files?.[0] ?? null)}
                />
                {(activityFileName || activityText.trim()) && (
                  <span className="mt-1 block font-body text-xs text-tri-muted">
                    {activityFileName ? `Loaded: ${activityFileName}` : "Restored from last session"}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-tri-faint">
                  Roster / program members (no teams in this file)
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => void onRosterFile(e.target.files?.[0] ?? null)}
                />
                {(rosterFileName || rosterText.trim()) && (
                  <span className="mt-1 block font-body text-xs text-tri-muted">
                    {rosterFileName ? `Loaded: ${rosterFileName}` : "Restored from last session"}
                  </span>
                )}
                <span className="mt-1 block font-body text-tri-nav text-tri-muted">
                  Expected columns include <strong>Email</strong> and <strong>Status</strong> (e.g. Active / Pending),
                  and usually <strong>Last active</strong>. Google program group members exports match this — there is
                  no team column; team names come from the shared Firebase team map (see Team management tab).
                </span>
              </label>
            </div>
            {(rows.length > 0 || roster.length > 0 || teamLookup.size > 0 || activityExcludedCount > 0 || rosterExcludedCount > 0) && (
              <div className="mt-4 rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm leading-relaxed text-tri-ink">
                {rows.length > 0 && <p>{activitySummary}</p>}
                {roster.length > 0 && (
                  <p className={rows.length > 0 ? "mt-2 border-t border-tri-border pt-2" : ""}>{rosterSummary}</p>
                )}
                {teamLookup.size > 0 && (
                  <p
                    className={
                      rows.length > 0 || roster.length > 0 ? "mt-2 border-t border-tri-border pt-2" : ""
                    }
                  >
                    {teamSummary}
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="tri-btn-muted"
                onClick={() => void saveWeek()}
                disabled={!metrics.length || savingSnapshot}
              >
                {savingSnapshot ? "Saving snapshot…" : "Save snapshot to history"}
              </button>
              <button
                type="button"
                className="tri-btn-primary disabled:opacity-40"
                onClick={() => void publishToStudents()}
                disabled={!metrics.length || publishing || clearingPublished}
              >
                {publishing ? "Publishing…" : "Publish to student page"}
              </button>
              <button
                type="button"
                className="tri-btn-muted disabled:opacity-40"
                onClick={() => void clearPublishedFromStudents()}
                disabled={publishing || clearingPublished}
              >
                {clearingPublished ? "Clearing…" : "Clear published board"}
              </button>
            </div>
            <WeekPicker
              mondayIso={effectiveWeekMondayIso}
              onMondayIsoChange={setWeekMondayIso}
              weekOptions={weekMondayOptions.length > 0 ? weekMondayOptions : undefined}
            />
            <label className="mt-4 block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Parent learning path</span>
              {parentOptions.length > 0 ? (
                <select
                  className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
                  value={parentOverride || parentName || ""}
                  onChange={(e) => setParentOverride(e.target.value)}
                >
                  <option value="">
                    Auto
                    {inferredParentWeek || inferredParentGlobal
                      ? ` (${inferredParentWeek ?? inferredParentGlobal})`
                      : ""}
                  </option>
                  {parentOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
                  placeholder={
                    allActivityRows.length
                      ? "No parent paths in activity export"
                      : "Upload activity CSV first"
                  }
                  value={parentOverride}
                  onChange={(e) => setParentOverride(e.target.value)}
                />
              )}
              <span className="mt-1 block text-xs text-tri-muted">
                {parentOptions.length > 0
                  ? `${parentOptions.length} learning paths found in activity export.`
                  : "Optional — filters focal courses when parent paths exist in the export."}
              </span>
            </label>
            <label className="mt-4 block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Week focal course</span>
              <select
                className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
                value={focalOverride || inferredFocal || ""}
                onChange={(e) => setFocalOverride(e.target.value)}
                disabled={!allActivityRows.length}
              >
                <option value="">
                  {allActivityRows.length
                    ? "Auto (most starters in week)"
                    : "Upload activity CSV first"}
                </option>
                {courseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {allActivityRows.length > 0 && (
                <span className="mt-1 block text-xs text-tri-muted">
                  {courseOptions.length} course
                  {courseOptions.length === 1 ? "" : "s"} from activity
                  {courseOptions.length
                    ? " (active in selected week when available)"
                    : " — none match the selected week or parent path"}
                </span>
              )}
            </label>
            <p className="mt-2 font-body text-tri-nav text-tri-muted">
              Publishing writes the current metrics and awards to this browser&apos;s local storage under a
              dedicated key, so the student route can stay read-only. For a shared URL across devices, host the
              built app and add a small backend later.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-tri border border-tri-border-md bg-tri-panel p-6 shadow-tri">
              <h3 className="font-display text-2xl font-semibold text-tri-ink">Weekly awards</h3>
              <p className="mt-2 font-body text-tri-nav text-tri-muted">
                Compare to a saved snapshot for “Most improved” and “Comeback team”.
              </p>
              <label className="mt-4 block font-nav text-tri-nav font-semibold uppercase tracking-wide text-tri-faint">
                Compare awards to
              </label>
              <select
                className="mt-1 w-full rounded border border-tri-border-md bg-tri-input-bg px-3 py-2 font-body text-tri-nav text-tri-ink"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">No baseline (momentum awards hidden)</option>
                {history
                  .filter((h) => h.id !== currentSnapshotId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.weekLabel} · {h.focalActivity.slice(0, 40)}
                      {h.focalActivity.length > 40 ? "…" : ""}
                    </option>
                  ))}
              </select>
              <ul className="mt-5 space-y-3 text-sm">
                <AwardRow icon="🥇" label="Team of the week" teams={awards.teamOfTheWeek} />
                <AwardRow icon="📈" label="Most improved" teams={awards.mostImproved} />
                <AwardRow icon="🔥" label="Perfect attendance" teams={awards.perfectAttendance} />
                <AwardRow icon="🧠" label="Deep learners" teams={awards.deepLearners} />
                <AwardRow icon="💪" label="Comeback team" teams={awards.comebackTeam} />
              </ul>
            </div>
            <FormulaCard />
          </div>
        </section>

        <section className="overflow-hidden rounded border border-tri-border bg-tri-sand shadow-card">
          <div className="border-b border-tri-border bg-tri-mist px-6 py-4">
            <h2 className="font-display text-tri-section text-tri-forest">Saved week snapshots</h2>
            <p className="mt-2 font-body text-tri-nav text-tri-muted">
              {usesFirebaseHistory()
                ? "Snapshots are stored in Firebase — any signed-in mentor can view, compare, or delete them (up to 24 weeks)."
                : "Snapshots are stored on this browser only (up to 24 weeks). Configure Firebase to share across mentors."}
              {" "}
              Open any week below to review past leaderboards or set it as the compare baseline for awards.
            </p>
          </div>
          {historyLoading ? (
            <p className="px-6 py-10 text-center font-body text-tri-nav text-tri-muted">Loading snapshots…</p>
          ) : history.length === 0 ? (
            <p className="px-6 py-10 text-center font-body text-tri-nav text-tri-muted">
              No snapshots yet. Upload data, compute scores, then save the current week.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {history.map((h) => {
                const top = h.metrics[0];
                const isCurrent = h.id === currentSnapshotId;
                const isViewing = h.id === viewHistoryId;
                return (
                  <li key={h.id} className="px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold text-tri-forest">{h.weekLabel}</p>
                        <p className="mt-1 truncate font-body text-tri-nav text-tri-muted" title={h.focalActivity}>
                          {h.focalActivity}
                        </p>
                        <p className="mt-2 font-body text-xs text-tri-muted">
                          Saved {formatSavedAt(h.savedAt)}
                          {h.savedBy ? ` · ${h.savedBy}` : ""} · {h.metrics.length} teams
                          {top ? (
                            <>
                              {" "}
                              · Leader: <span className="font-medium text-tri-ink">{top.team}</span> (
                              {fmt1(top.totalScore)} pts)
                            </>
                          ) : null}
                          {isCurrent ? (
                            <span className="ml-2 rounded bg-tri-leaf/15 px-1.5 py-0.5 font-semibold text-tri-forest">
                              matches current week
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          className="tri-btn-muted text-sm"
                          onClick={() => setViewHistoryId(isViewing ? "" : h.id)}
                        >
                          {isViewing ? "Hide" : "View"}
                        </button>
                        <button
                          type="button"
                          className="tri-btn-muted text-sm"
                          onClick={() => setCompareId(h.id === compareId ? "" : h.id)}
                        >
                          {h.id === compareId ? "Comparing" : "Compare"}
                        </button>
                        <button
                          type="button"
                          className="tri-btn-muted text-sm text-red-800"
                          onClick={() => void removeSnapshot(h.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {isViewing && (
                      <div className="mt-4 overflow-hidden rounded border border-tri-border">
                        <MentorLeaderboardTable metrics={h.metrics} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {viewedSnapshot && (
            <div className="border-t border-tri-border bg-tri-mist/40 px-6 py-3 font-body text-tri-nav text-tri-muted">
              Viewing snapshot: <strong>{viewedSnapshot.weekLabel}</strong>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded border border-tri-border bg-tri-sand shadow-card">
          <div className="flex flex-col gap-2 border-b border-tri-border bg-tri-mist px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-tri-section text-tri-forest">Current week (draft)</h2>
              <p className="mt-1 font-body text-tri-nav text-tri-muted">
                {focalActivity ? (
                  <>
                    Focal course: <span className="font-medium text-tri-ink">{focalActivity}</span>
                  </>
                ) : (
                  "Select or upload data to compute scores."
                )}
              </p>
            </div>
            <div className="text-right font-body text-tri-nav text-tri-faint">
              Effort cap: <strong>{METRICS.effort.expectedWeeklyMinutesPerMember}</strong> minutes / active
              member
            </div>
          </div>
          <MentorLeaderboardTable
            metrics={metrics}
            emptyMessage="Upload a valid activity CSV and roster, then pick the focal course for this week."
          />
        </section>

          </>
        )}

      </main>
    </div>
  );
}

function AwardRow({ icon, label, teams }: { icon: string; label: string; teams: string[] }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-lg leading-none">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-tri-faint">{label}</p>
        <p className="font-medium text-tri-ink">{formatAwardTeams(teams)}</p>
      </div>
    </li>
  );
}

function FormulaCard() {
  return (
    <div className="rounded border border-tri-border bg-tri-sand p-5 font-body text-tri-lead text-tri-muted shadow-card">
      <h3 className="font-display text-2xl text-tri-forest">Scoring (max {METRICS.totalMaxPoints})</h3>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-tri-nav leading-relaxed">
        {METRIC_DEFINITIONS.map((d) => (
          <li key={d.id}>
            <strong>{d.maxPoints}</strong> — {d.summary}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-tri-nav text-tri-muted">
        Full reference: <code className="text-sm">docs/METRICS.md</code> · weights in{" "}
        <code className="text-sm">src/lib/metrics.js</code>.
      </p>
    </div>
  );
}
