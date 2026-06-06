import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured, waitForFirebaseUser } from "../lib/firebase";
import { fetchTeamDescriptionsFromServer } from "../lib/firebaseTeamDescriptions";
import { fetchTeamDiscordFromServer } from "../lib/firebaseTeamDiscord";
import { fetchTeamLeadersFromServer } from "../lib/firebaseTeamLeaders";
import { fetchTeamMapFromServer } from "../lib/firebaseTeamMap";
import { parseTeamAssignmentsCsv } from "../lib/teamAssignments";
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
};

export function useTeamPortalData(enabled: boolean): TeamPortalData {
  const [teamMapCsv, setTeamMapCsv] = useState("");
  const [leadersCsv, setLeadersCsv] = useState("");
  const [descriptionsCsv, setDescriptionsCsv] = useState("");
  const [discordCsv, setDiscordCsv] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        try {
          const [teamMap, leaders, descriptions, discord] = await Promise.all([
            fetchTeamMapFromServer(),
            fetchTeamLeadersFromServer(),
            fetchTeamDescriptionsFromServer(),
            fetchTeamDiscordFromServer(),
          ]);
          if (cancelled) return;
          setTeamMapCsv(teamMap?.csv ?? "");
          setLeadersCsv(leaders?.csv ?? "");
          setDescriptionsCsv(descriptions?.csv ?? "");
          setDiscordCsv(discord?.csv ?? "");
          setRosterLoaded(true);
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Could not load team data.");
          setRosterLoaded(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
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
  }, [enabled]);

  const assignments = useMemo(() => {
    if (!teamMapCsv.trim()) return [];
    try {
      return parseTeamAssignmentsCsv(teamMapCsv);
    } catch (err) {
      console.error("Team assignments CSV parse failed:", err);
      return [];
    }
  }, [teamMapCsv]);

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

  return { loading, rosterLoaded, error, assignments, profiles, descriptions, discordLinks };
}
