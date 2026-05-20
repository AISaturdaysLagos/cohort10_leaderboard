import { useMemo } from "react";
import type { ActivityRow } from "../types";

export function useLatestCourseDate(rows: ActivityRow[]): Date | null {
  return useMemo(() => {
    let max: Date | null = null;
    for (const r of rows) {
      if (r.activityType.trim().toLowerCase() !== "course") continue;
      if (r.dateStarted && (!max || r.dateStarted > max)) max = r.dateStarted;
    }
    return max;
  }, [rows]);
}
