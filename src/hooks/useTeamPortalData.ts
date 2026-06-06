import { useCallback, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured, waitForFirebaseUser } from "../lib/firebase";
import { fetchTeamDescriptionsFromServer } from "../lib/firebaseTeamDescriptions";
import { fetchTeamDiscordFromServer } from "../lib/firebaseTeamDiscord";
import { fetchTeamLeadersFromServer } from "../lib/firebaseTeamLeaders";
import { fetchTeamMapFromServer } from "../lib/firebaseTeamMap";
import {
  assignmentsFromLeaderProfiles,
  parseTeamAssignmentsCsv,
} from "../lib/teamAssignments";
import { parseTeamDescriptionsCsv, teamDescriptionsById } from "../lib/teamDescriptions";
import { subscribeTeamDescriptions } from "../lib/teamDescriptionsMap";
import { parseTeamDiscordCsv, teamDiscordById } from "../lib/teamDiscord";
import { subscribeTeamDiscord } from "../lib/teamDiscordMap";
import { parseTeamLeadersCsv, teamLeadersToLookup } from "../lib/teamLeaders";
import { subscribeTeamLeaders } from "../lib/teamLeadersMap";
import { subscribeTeamMap } from "../lib/teamMap";
import type { TeamAssignmentRow, TeamDescription, TeamDiscordLink, TeamMemberProfile } from "../types";

export type TeamPortalData = {
  loading: boolean;
  rosterLoaded: boolean;
  error: string | null;
  assignments: TeamAssignmentRow[];
  profiles: Map<string, TeamMemberProfile>;
  descriptions: Map<string, TeamDescription>;
  discordLinks: Map<string, TeamDiscordLink>;
  reload: () => void;
};

function parseAssignments(teamMapCsv: string, leadersCsv: string): TeamAssignmentRow[] {
  if (teamMapCsv.trim()) {
    try {
      const fromMap = parseTeamAssignmentsCsv(teamMapCsv);
      if (fromMap.length > 0) return fromMap;
    } catch (err) {
      console.error("Team assignments CSV parse failed:", err);
    }
  }

  if (leadersCsv.trim()) {
    try {
      return assignmentsFromLeaderProfiles(parseTeamLeadersCsv(leadersCsv));
    } catch (err) {
      console.error("Team leaders CSV parse failed:", err);
    }
  }

  return [];
}

function firstRejectedReason(results: PromiseSettledResult<unknown>[]): string | null {
  for (const result of results) {
    if (result.status === "rejected") {
      const reason = result.reason;
      if (reason instanceof Error) return reason.message;
      return String(reason);
    }
  }
  return null;
}

export function useTeamPortalData(enabled: boolean): TeamPortalData {
  const [teamMapCsv, setTeamMapCsv] = useState("");
  const [leadersCsv, setLeadersCsv] = useState("");
  const [descriptionsCsv, setDescriptionsCsv] = useState("");
  const [discordCsv, setDiscordCsv] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRosterLoaded(false);
      setTeamMapCsv("");
      setLeadersCsv("");
      setDescriptionsCsv("");
      setDiscordCsv("");
      return;
    }

    let cancelled = false;
    const cleanups: (() => void)[] = [];

    void (async () => {
      setLoading(true);
      setRosterLoaded(false);
      setError(null);
      await waitForFirebaseUser();
      if (cancelled) return;

      if (isFirebaseConfigured()) {
        const results = await Promise.allSettled([
          fetchTeamMapFromServer(),
          fetchTeamLeadersFromServer(),
          fetchTeamDescriptionsFromServer(),
          fetchTeamDiscordFromServer(),
        ]);
        if (cancelled) return;

        const [teamMapResult, leadersResult, descriptionsResult, discordResult] = results;
        const teamMap = teamMapResult.status === "fulfilled" ? teamMapResult.value : null;
        const leaders = leadersResult.status === "fulfilled" ? leadersResult.value : null;
        const descriptions =
          descriptionsResult.status === "fulfilled" ? descriptionsResult.value : null;
        const discord = discordResult.status === "fulfilled" ? discordResult.value : null;

        setTeamMapCsv(teamMap?.csv ?? "");
        setLeadersCsv(leaders?.csv ?? "");
        setDescriptionsCsv(descriptions?.csv ?? "");
        setDiscordCsv(discord?.csv ?? "");
        setRosterLoaded(true);

        const mapCsv = teamMap?.csv?.trim() ?? "";
        const leadersCsvData = leaders?.csv?.trim() ?? "";
        if (!mapCsv && !leadersCsvData) {
          setError(firstRejectedReason(results) ?? "Team roster has not been published yet.");
        } else {
          const fetchError = firstRejectedReason(results);
          if (fetchError) setError(fetchError);
        }

        setLoading(false);
        return;
      }

      let pending = 4;
      const streamFinished = () => {
        pending -= 1;
        if (pending <= 0) {
          setRosterLoaded(true);
          setLoading(false);
        }
      };

      cleanups.push(
        subscribeTeamMap(
          (data) => {
            setTeamMapCsv(data?.csv ?? "");
            streamFinished();
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            streamFinished();
          },
        ),
      );
      cleanups.push(
        subscribeTeamLeaders(
          (data) => {
            setLeadersCsv(data?.csv ?? "");
            streamFinished();
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            streamFinished();
          },
        ),
      );
      cleanups.push(
        subscribeTeamDescriptions(
          (data) => {
            setDescriptionsCsv(data?.csv ?? "");
            streamFinished();
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            streamFinished();
          },
        ),
      );
      cleanups.push(
        subscribeTeamDiscord(
          (data) => {
            setDiscordCsv(data?.csv ?? "");
            streamFinished();
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            streamFinished();
          },
        ),
      );
    })();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [enabled, reloadToken]);

  const assignments = useMemo(
    () => parseAssignments(teamMapCsv, leadersCsv),
    [teamMapCsv, leadersCsv],
  );

  const profiles = useMemo(() => {
    if (!leadersCsv.trim()) return new Map<string, TeamMemberProfile>();
    try {
      return teamLeadersToLookup(parseTeamLeadersCsv(leadersCsv));
    } catch {
      return new Map<string, TeamMemberProfile>();
    }
  }, [leadersCsv]);

  const descriptions = useMemo(() => {
    if (!descriptionsCsv.trim()) return new Map<string, TeamDescription>();
    try {
      return teamDescriptionsById(parseTeamDescriptionsCsv(descriptionsCsv));
    } catch (err) {
      console.error("Team descriptions CSV parse failed:", err);
      return new Map<string, TeamDescription>();
    }
  }, [descriptionsCsv]);

  const discordLinks = useMemo(() => {
    if (!discordCsv.trim()) return new Map<string, TeamDiscordLink>();
    try {
      return teamDiscordById(parseTeamDiscordCsv(discordCsv));
    } catch {
      return new Map<string, TeamDiscordLink>();
    }
  }, [discordCsv]);

  return { loading, rosterLoaded, error, assignments, profiles, descriptions, discordLinks, reload };
}
