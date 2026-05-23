import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { Link } from "react-router-dom";
import type { WeekBounds } from "../types";
import {
  activityDateExtent,
  formatWeekLabel,
  listUtcWeekMondaysBetween,
  utcMondayIsoFromDate,
  weekBoundsFromMondayIso,
} from "../lib/dates";
import { parseActivityCsv, parseRosterCsv, parseTeamLookupCsv, mergeTeamAssignments } from "../lib/parseCsv";
import {
  computeTeamMetrics,
  computeWeeklyAwards,
  METRIC_DEFINITIONS,
  METRICS,
} from "../lib/metrics.js";
import {
  inferDominantParent,
  inferDominantParentGlobal,
  inferFocalCourse,
  listCourseActivities,
  snapshotId,
} from "../lib/scoring";
import { MentorLeaderboardTable } from "../components/MentorLeaderboardTable";
import { WeekPicker } from "../components/WeekPicker";
import { deleteHistoryEntry, loadHistory, saveHistoryEntry, type HistoryEntry } from "../lib/history";
import { savePublished } from "../lib/published";
import { fmt1, formatAwardTeams, formatSavedAt } from "../lib/format";
import { activityImportSummary, rosterImportSummary, teamLookupSummary } from "../lib/importSummary";
import { useLatestCourseDate } from "../hooks/useLatestCourseDate";
import { publicAsset } from "../lib/publicAsset";

const EMPTY_TEAM_MAP = new Map<string, string>();

export function AdminPage() {
  const [activityText, setActivityText] = useState<string>("");
  const [rosterText, setRosterText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [weekMondayIso, setWeekMondayIso] = useState("2026-04-14");
  const [parentOverride, setParentOverride] = useState("");
  const [focalOverride, setFocalOverride] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareId, setCompareId] = useState<string>("");
  const [viewHistoryId, setViewHistoryId] = useState<string>("");
  const [rosterTeamFallback, setRosterTeamFallback] = useState("");
  const [teamsText, setTeamsText] = useState("");
  const deferredActivityText = useDeferredValue(activityText);
  const deferredRosterText = useDeferredValue(rosterText);
  const deferredTeamsText = useDeferredValue(teamsText);

  const rows = useMemo(() => {
    if (!deferredActivityText.trim()) return [];
    try {
      return parseActivityCsv(deferredActivityText);
    } catch {
      return [];
    }
  }, [deferredActivityText]);

  const teamLookup = useMemo(() => {
    if (!deferredTeamsText.trim()) return EMPTY_TEAM_MAP;
    try {
      return parseTeamLookupCsv(deferredTeamsText);
    } catch {
      return EMPTY_TEAM_MAP;
    }
  }, [deferredTeamsText]);

  const roster = useMemo(() => {
    if (!deferredRosterText.trim()) return [];
    try {
      const base = parseRosterCsv(deferredRosterText, {
        defaultTeamWhenMissing: rosterTeamFallback.trim() || undefined,
      });
      return mergeTeamAssignments(base, teamLookup);
    } catch {
      return [];
    }
  }, [deferredRosterText, rosterTeamFallback, teamLookup]);

  const isParsing =
    activityText !== deferredActivityText ||
    rosterText !== deferredRosterText ||
    teamsText !== deferredTeamsText;

  const teamSummary = useMemo(() => teamLookupSummary(teamLookup), [teamLookup]);

  const week: WeekBounds = useMemo(() => weekBoundsFromMondayIso(weekMondayIso), [weekMondayIso]);

  const weekMondayOptions = useMemo(() => {
    const extent = activityDateExtent(rows);
    if (!extent) return [];
    return listUtcWeekMondaysBetween(extent.min, extent.max).reverse();
  }, [rows]);

  const latestCourseDate = useLatestCourseDate(rows);

  const inferredParentWeek = useMemo(
    () => (rows.length ? inferDominantParent(rows, week) : null),
    [rows, week],
  );
  const inferredParentGlobal = useMemo(
    () => (rows.length ? inferDominantParentGlobal(rows) : null),
    [rows],
  );

  const parentName = useMemo(() => {
    const o = parentOverride.trim();
    if (o) return o;
    return inferredParentWeek ?? inferredParentGlobal;
  }, [parentOverride, inferredParentWeek, inferredParentGlobal]);

  const inferredFocal = useMemo(() => {
    if (!rows.length || !parentName) return null;
    return inferFocalCourse(rows, week, parentName);
  }, [rows, week, parentName]);

  const focalActivity = useMemo(() => {
    const o = focalOverride.trim();
    if (o) return o;
    return inferredFocal ?? "";
  }, [focalOverride, inferredFocal]);

  const courseOptions = useMemo(() => listCourseActivities(rows, parentName), [rows, parentName]);

  const activitySummary = useMemo(() => activityImportSummary(rows), [rows]);
  const rosterSummary = useMemo(() => rosterImportSummary(roster), [roster]);

  const metrics = useMemo(() => {
    if (!rows.length || !roster.length || !focalActivity) return [];
    try {
      return computeTeamMetrics(rows, roster, week, focalActivity);
    } catch {
      return [];
    }
  }, [rows, roster, week, focalActivity]);

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

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory());
  }, []);

  const removeSnapshot = (id: string) => {
    if (!window.confirm("Remove this saved snapshot from history?")) return;
    deleteHistoryEntry(id);
    if (viewHistoryId === id) setViewHistoryId("");
    if (compareId === id) setCompareId("");
    refreshHistory();
  };

  const loadSamples = useCallback(async () => {
    setError(null);
    try {
      const [a, r] = await Promise.all([
        fetch(publicAsset("sample-week-activity.csv")).then((x) => x.text()),
        fetch(publicAsset("sample-roster.csv")).then((x) => x.text()),
      ]);
      setActivityText(a);
      setRosterText(r);
      const parsed = parseActivityCsv(a);
      const anchor =
        parsed
          .filter((row) => row.activityType.trim().toLowerCase() === "course" && row.dateStarted)
          .map((row) => row.dateStarted!)
          .sort((x, y) => y.getTime() - x.getTime())[0] ?? new Date();
      setWeekMondayIso(utcMondayIsoFromDate(anchor));
      setParentOverride("");
      setFocalOverride("");
      setRosterTeamFallback("");
      setTeamsText("");
    } catch {
      setError("Could not load sample files from /public.");
    }
  }, []);

  const loadProgramRosterSample = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(publicAsset("sample-program-roster.csv")).then((x) => x.text());
      setRosterText(r);
      setRosterTeamFallback("");
    } catch {
      setError("Could not load sample program roster from /public.");
    }
  }, []);

  const loadTeamsSample = useCallback(async () => {
    setError(null);
    try {
      const t = await fetch(publicAsset("sample-teams.csv")).then((x) => x.text());
      parseTeamLookupCsv(t);
      setTeamsText(t);
    } catch {
      setError("Could not load sample teams from /public.");
    }
  }, []);

  /** 100 teams × 10 students — see `public/sample-100teams-*.csv` (regenerate: `npm run generate:sample-100teams`). */
  const load100TeamsSample = useCallback(async () => {
    setError(null);
    try {
      const [a, r, t] = await Promise.all([
        fetch(publicAsset("sample-100teams-activity.csv")).then(async (x) => {
          if (!x.ok) throw new Error(`sample-100teams-activity.csv → HTTP ${x.status}`);
          return x.text();
        }),
        fetch(publicAsset("sample-100teams-roster.csv")).then(async (x) => {
          if (!x.ok) throw new Error(`sample-100teams-roster.csv → HTTP ${x.status}`);
          return x.text();
        }),
        fetch(publicAsset("sample-100teams-teams.csv")).then(async (x) => {
          if (!x.ok) throw new Error(`sample-100teams-teams.csv → HTTP ${x.status}`);
          return x.text();
        }),
      ]);
      setActivityText(a);
      setRosterText(r);
      parseTeamLookupCsv(t);
      setTeamsText(t);
      const parsed = parseActivityCsv(a);
      const anchor =
        parsed
          .filter((row) => row.activityType.trim().toLowerCase() === "course" && row.dateStarted)
          .map((row) => row.dateStarted!)
          .sort((x, y) => y.getTime() - x.getTime())[0] ?? new Date("2026-04-16T12:00:00Z");
      setWeekMondayIso(utcMondayIsoFromDate(anchor));
      setParentOverride("");
      setFocalOverride("");
      setRosterTeamFallback("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes("CSV parse")
          ? `${msg} — try running \`npm run generate:sample-100teams\` to refresh the files in public/.`
          : `Could not load sample-100teams CSVs from /public. ${msg}`,
      );
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => refreshHistory(), 0);
    return () => window.clearTimeout(id);
  }, [refreshHistory]);

  const onActivityFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    const t = await f.text();
    setActivityText(t);
    try {
      const parsed = parseActivityCsv(t);
      const anchor =
        parsed
          .filter((row) => row.activityType.trim().toLowerCase() === "course" && row.dateStarted)
          .map((row) => row.dateStarted!)
          .sort((x, y) => y.getTime() - x.getTime())[0] ?? new Date();
      setWeekMondayIso(utcMondayIsoFromDate(anchor));
      setFocalOverride("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid activity CSV");
    }
  };

  const onRosterFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    try {
      setRosterText(await f.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid roster CSV");
    }
  };

  const onTeamsFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    try {
      const t = await f.text();
      parseTeamLookupCsv(t);
      setTeamsText(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid team CSV");
    }
  };

  const saveWeek = () => {
    if (!focalActivity || !metrics.length) return;
    const id = snapshotId(week, focalActivity);
    const entry: HistoryEntry = {
      id,
      weekLabel,
      focalActivity,
      metrics,
      savedAt: new Date().toISOString(),
    };
    saveHistoryEntry(entry);
    refreshHistory();
    setViewHistoryId(id);
  };

  const publishToStudents = () => {
    if (!focalActivity || !metrics.length) return;
    savePublished({ weekLabel, focalActivity, metrics, awards });
    setPublishMsg("Students now see this board on the home page.");
    window.setTimeout(() => setPublishMsg(null), 5000);
  };

  return (
    <>
      <header className="border-b border-black/10 bg-tri-forest text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:justify-between sm:py-16">
          <div>
            <p className="font-body text-tri-lead text-white/80">Mentor admin · TRI AI Saturdays League</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] text-white sm:text-tri-hero">
              Weekly scoreboard controls
            </h1>
            <p className="mt-4 max-w-xl font-body text-tri-lead text-white/90">
              Upload Skills Boost exports, tune the week and focal course, then{" "}
              <strong>publish</strong> so learners only see the curated student view — no raw CSVs or roster
              emails.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="tri-btn-primary" to="/">
                Open student view
              </Link>
              <a
                className="tri-btn-outline-hero"
                href="https://tri-ai.org"
                target="_blank"
                rel="noreferrer"
              >
                tri-ai.org
              </a>
            </div>
          </div>
          <div className="rounded border border-white/15 bg-white/5 p-5 sm:max-w-xs">
            <p className="font-nav text-tri-nav font-semibold uppercase tracking-wide text-white/60">Draft week</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">{weekLabel}</p>
            {latestCourseDate && (
              <p className="mt-2 font-body text-tri-nav text-white/70">
                Latest course activity (UTC): {latestCourseDate.toISOString().slice(0, 10)}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {publishMsg && (
          <div className="rounded border border-tri-leaf/40 bg-tri-mist px-4 py-3 font-body text-tri-nav text-tri-forest">
            {publishMsg}
          </div>
        )}
        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 font-body text-sm text-red-900">
            {error}
          </div>
        )}
        {isParsing && (
          <div className="rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm text-tri-forest">
            Processing uploaded CSV data…
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded border border-neutral-200 bg-tri-sand p-6 shadow-card lg:col-span-2">
            <h2 className="font-display text-tri-section text-tri-forest">Data & week scope</h2>
            <p className="mt-3 font-body text-tri-lead text-tri-ink/80">
              Each week: upload the <strong>activity</strong> export from Skills Boost, then the{" "}
              <strong>roster or program members</strong> export (emails, Active/Pending, last active — these files do{" "}
              <strong>not</strong> include team names). Team names for the leaderboard come only from the{" "}
              <strong>Email + Team</strong> file below, or from one shared label if everyone should score in a single
              team.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-tri-ink/50">
                  Activity CSV
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => void onActivityFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-tri-ink/50">
                  Roster / program members (no teams in this file)
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => void onRosterFile(e.target.files?.[0] ?? null)}
                />
                <span className="mt-1 block font-body text-tri-nav text-tri-ink/60">
                  Expected columns include <strong>Email</strong> and <strong>Status</strong> (e.g. Active / Pending),
                  and usually <strong>Last active</strong>. Google program group members exports match this — there is
                  no team column; use the team map CSV to assign learners to teams.
                </span>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-tri-ink/50">
                Team map CSV (Email + Team)
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="mt-2 block w-full text-sm"
                onChange={(e) => void onTeamsFile(e.target.files?.[0] ?? null)}
              />
              <span className="mt-1 block font-body text-tri-nav text-tri-ink/60">
                One row per learner: <strong>Email</strong>, <strong>Team</strong>. This is the only place team names
                are read from. If you skip this file, everyone is placed in the single-team label below (default{" "}
                <strong>Cohort</strong>).
              </span>
            </label>
            <label className="mt-4 block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Single team name (only when you do not upload a team map)</span>
              <input
                className="mt-1 w-full rounded border border-neutral-300 bg-tri-sand px-3 py-2 font-body text-tri-nav"
                placeholder="Leave blank to use “Cohort”"
                value={rosterTeamFallback}
                onChange={(e) => setRosterTeamFallback(e.target.value)}
              />
            </label>
            {(rows.length > 0 || roster.length > 0 || teamLookup.size > 0) && (
              <div className="mt-4 rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm leading-relaxed text-tri-ink">
                {rows.length > 0 && <p>{activitySummary}</p>}
                {roster.length > 0 && (
                  <p className={rows.length > 0 ? "mt-2 border-t border-neutral-200 pt-2" : ""}>{rosterSummary}</p>
                )}
                {teamLookup.size > 0 && (
                  <p
                    className={
                      rows.length > 0 || roster.length > 0 ? "mt-2 border-t border-neutral-200 pt-2" : ""
                    }
                  >
                    {teamSummary}
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="tri-btn-primary" onClick={() => void loadSamples()}>
                Reload sample week
              </button>
              <button type="button" className="tri-btn-muted" onClick={() => void loadProgramRosterSample()}>
                Load program members sample
              </button>
              <button type="button" className="tri-btn-muted" onClick={() => void loadTeamsSample()}>
                Load team map sample
              </button>
              <button type="button" className="tri-btn-muted" onClick={() => void load100TeamsSample()}>
                Load sample (100 teams × 10)
              </button>
              <button type="button" className="tri-btn-muted" onClick={saveWeek} disabled={!metrics.length}>
                Save snapshot to history
              </button>
              <button
                type="button"
                className="tri-btn-primary disabled:opacity-40"
                onClick={publishToStudents}
                disabled={!metrics.length}
              >
                Publish to student page
              </button>
            </div>
            <WeekPicker
              mondayIso={weekMondayIso}
              onMondayIsoChange={setWeekMondayIso}
              weekOptions={weekMondayOptions.length > 0 ? weekMondayOptions : undefined}
            />
            <label className="mt-4 block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Parent learning path (override)</span>
              <input
                className="mt-1 w-full rounded border border-neutral-300 bg-tri-sand px-3 py-2 font-body text-tri-nav"
                placeholder={inferredParentWeek ?? inferredParentGlobal ?? "Detected automatically"}
                value={parentOverride}
                onChange={(e) => setParentOverride(e.target.value)}
              />
            </label>
            <label className="mt-4 block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Week focal course</span>
              <select
                className="mt-1 w-full rounded border border-neutral-300 bg-tri-sand px-3 py-2 font-body text-tri-nav"
                value={focalOverride || inferredFocal || ""}
                onChange={(e) => setFocalOverride(e.target.value)}
              >
                <option value="">Auto (most starters in week)</option>
                {courseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 font-body text-tri-nav text-tri-ink/60">
              Publishing writes the current metrics and awards to this browser&apos;s local storage under a
              dedicated key, so the student route can stay read-only. For a shared URL across devices, host the
              built app and add a small backend later.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded border border-white/10 bg-tri-forest p-6 text-white shadow-tri">
              <h3 className="font-display text-2xl font-semibold text-white">Weekly awards</h3>
              <p className="mt-2 font-body text-tri-nav text-white/75">
                Compare to a saved snapshot for “Most improved” and “Comeback team”.
              </p>
              <label className="mt-4 block font-nav text-tri-nav font-semibold uppercase tracking-wide text-white/60">
                Compare awards to
              </label>
              <select
                className="mt-1 w-full rounded border border-white/20 bg-white/10 px-3 py-2 font-body text-tri-nav text-white"
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

        <section className="overflow-hidden rounded border border-neutral-200 bg-tri-sand shadow-card">
          <div className="border-b border-neutral-200 bg-tri-mist px-6 py-4">
            <h2 className="font-display text-tri-section text-tri-forest">Saved week snapshots</h2>
            <p className="mt-2 font-body text-tri-nav text-tri-ink/70">
              Every <strong>Save snapshot to history</strong> stores rankings for this browser (up to 24 weeks).
              Open any week below to review past leaderboards or set it as the compare baseline for awards.
            </p>
          </div>
          {history.length === 0 ? (
            <p className="px-6 py-10 text-center font-body text-tri-nav text-tri-ink/55">
              No snapshots yet. Upload data, compute scores, then save the current week.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {history.map((h) => {
                const top = h.metrics[0];
                const isCurrent = h.id === currentSnapshotId;
                const isViewing = h.id === viewHistoryId;
                return (
                  <li key={h.id} className="px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold text-tri-forest">{h.weekLabel}</p>
                        <p className="mt-1 truncate font-body text-tri-nav text-tri-ink/75" title={h.focalActivity}>
                          {h.focalActivity}
                        </p>
                        <p className="mt-2 font-body text-xs text-tri-ink/55">
                          Saved {formatSavedAt(h.savedAt)} · {h.metrics.length} teams
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
                          onClick={() => removeSnapshot(h.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {isViewing && (
                      <div className="mt-4 overflow-hidden rounded border border-neutral-200">
                        <MentorLeaderboardTable metrics={h.metrics} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {viewedSnapshot && (
            <div className="border-t border-neutral-200 bg-tri-mist/40 px-6 py-3 font-body text-tri-nav text-tri-ink/65">
              Viewing snapshot: <strong>{viewedSnapshot.weekLabel}</strong>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded border border-neutral-200 bg-tri-sand shadow-card">
          <div className="flex flex-col gap-2 border-b border-neutral-200 bg-tri-mist px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-tri-section text-tri-forest">Current week (draft)</h2>
              <p className="mt-1 font-body text-tri-nav text-tri-ink/70">
                {focalActivity ? (
                  <>
                    Focal course: <span className="font-medium text-tri-ink">{focalActivity}</span>
                  </>
                ) : (
                  "Select or upload data to compute scores."
                )}
              </p>
            </div>
            <div className="text-right font-body text-tri-nav text-tri-ink/50">
              Effort cap: <strong>{METRICS.effort.expectedWeeklyMinutesPerMember}</strong> minutes / active
              member
            </div>
          </div>
          <MentorLeaderboardTable
            metrics={metrics}
            emptyMessage="Upload a valid activity CSV and roster, then pick the focal course for this week."
          />
        </section>

        <footer className="border-t border-neutral-200 bg-tri-night pb-12 pt-8 text-center font-body text-tri-nav text-white/70">
          <p>
            Admin tools stay on this route. Raw exports never leave your machine until you choose to publish
            summaries. Student route:{" "}
            <Link className="font-medium text-tri-leaf no-underline hover:text-tri-mint" to="/">
              /
            </Link>
          </p>
        </footer>
      </main>
    </>
  );
}

function AwardRow({ icon, label, teams }: { icon: string; label: string; teams: string[] }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-lg leading-none">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
        <p className="font-medium text-white">{formatAwardTeams(teams)}</p>
      </div>
    </li>
  );
}

function FormulaCard() {
  return (
    <div className="rounded border border-neutral-200 bg-tri-sand p-5 font-body text-tri-lead text-tri-ink/85 shadow-card">
      <h3 className="font-display text-2xl text-tri-forest">Scoring (max {METRICS.totalMaxPoints})</h3>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-tri-nav leading-relaxed">
        {METRIC_DEFINITIONS.map((d) => (
          <li key={d.id}>
            <strong>{d.maxPoints}</strong> — {d.summary}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-tri-nav text-tri-ink/65">
        Full reference: <code className="text-sm">docs/METRICS.md</code> · weights in{" "}
        <code className="text-sm">src/lib/metrics.js</code>.
      </p>
    </div>
  );
}
