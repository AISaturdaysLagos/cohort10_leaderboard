import {
  formatWeekLabel,
  snapIsoToUtcMonday,
  utcSundayIsoFromMondayIso,
  weekBoundsFromMondayIso,
} from "../lib/dates";

type Props = {
  /** ISO date of the Monday (UTC) for the selected week. */
  mondayIso: string;
  onMondayIsoChange: (isoMonday: string) => void;
  /** Optional Mondays (newest first) derived from uploaded activity. */
  weekOptions?: string[];
};

export function WeekPicker({ mondayIso, onMondayIsoChange, weekOptions }: Props) {
  const bounds = weekBoundsFromMondayIso(mondayIso);
  const sundayIso = utcSundayIsoFromMondayIso(mondayIso);
  const rangeMin = weekOptions?.length ? weekOptions[weekOptions.length - 1] : undefined;
  const rangeMax = weekOptions?.length ? weekOptions[0] : undefined;

  return (
    <div className="mt-6 rounded border border-tri-border bg-tri-mist/50 p-4">
      <p className="font-nav text-xs font-semibold uppercase tracking-wide text-tri-faint">
        Scoring week (UTC, Monday–Sunday)
      </p>
      <p className="mt-1 font-body text-tri-nav text-tri-muted">
        Pick any day in the week — it snaps to that week&apos;s Monday. End is always the following Sunday.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block font-body text-tri-nav">
          <span className="font-medium text-tri-ink">Week containing (date)</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
            value={mondayIso}
            min={rangeMin}
            max={rangeMax}
            step={7}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onMondayIsoChange(snapIsoToUtcMonday(v));
            }}
          />
        </label>

        {weekOptions && weekOptions.length > 0 ? (
          <label className="block font-body text-tri-nav">
            <span className="font-medium text-tri-ink">Or choose from activity range</span>
            <select
              className="mt-1 w-full rounded border border-tri-border-md bg-tri-sand px-3 py-2 font-body text-tri-nav"
              value={mondayIso}
              onChange={(e) => onMondayIsoChange(e.target.value)}
            >
              {weekOptions.map((iso) => (
                <option key={iso} value={iso}>
                  {formatWeekLabel(weekBoundsFromMondayIso(iso))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex flex-col justify-end font-body text-tri-nav">
            <span className="font-medium text-tri-ink">Sunday (UTC, auto)</span>
            <p className="mt-1 rounded border border-tri-border bg-tri-sand px-3 py-2 text-tri-muted">
              {sundayIso}
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 font-body text-sm text-tri-muted">
        <span className="font-medium text-tri-forest">{formatWeekLabel(bounds)}</span>
        <span className="text-tri-faint"> · Mon {mondayIso} → Sun {sundayIso}</span>
      </p>
    </div>
  );
}
