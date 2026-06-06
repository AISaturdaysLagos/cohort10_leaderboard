import { useEffect, useMemo, useRef, useState } from "react";
import { waitForFirebaseUser } from "../lib/firebase";
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

type StreamKey = "map" | "leaders" | "descriptions" | "discord";

type StreamSeen = Record<StreamKey, boolean>;

function markStreamReady(
  key: StreamKey,
  seen: { current: StreamSeen },
  onReady: () => void,
): void {
  if (seen.current[key]) return;
  seen.current[key] = true;
  onReady();
}

export function useTeamPortalData(enabled: boolean): TeamPortalData {
  const [teamMapCsv, setTeamMapCsv] = useState("");
  const [leadersCsv, setLeadersCsv] = useState("");
  const [descriptionsCsv, setDescriptionsCsv] = useState("");
  const [discordCsv, setDiscordCsv] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamsSeen = useRef<StreamSeen>({
    map: false,
    leaders: false,
    descriptions: false,
    discord: false,
  });

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRosterLoaded(false);
      setTeamMapCsv("");
      setLeadersCsv("");
      setDescriptionsCsv("");
      setDiscordCsv("");
      streamsSeen.current = { map: false, leaders: false, descriptions: false, discord: false };
      return;
    }

    let cancelled = false;
    const cleanups: (() => void)[] = [];
    streamsSeen.current = { map: false, leaders: false, descriptions: false, discord: false };
    setRosterLoaded(false);
    setLoading(true);

    let pending = 4;
    const streamFinished = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    void (async () => {
      setError(null);
      await waitForFirebaseUser();
      if (cancelled) return;

      cleanups.push(
        subscribeTeamMap(
          (data) => {
            setTeamMapCsv(data?.csv ?? "");
            markStreamReady("map", streamsSeen, () => {
              setRosterLoaded(true);
              streamFinished();
            });
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            markStreamReady("map", streamsSeen, () => {
              setRosterLoaded(true);
              streamFinished();
            });
          },
        ),
      );
      cleanups.push(
        subscribeTeamLeaders(
          (data) => {
            setLeadersCsv(data?.csv ?? "");
            markStreamReady("leaders", streamsSeen, streamFinished);
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            markStreamReady("leaders", streamsSeen, streamFinished);
          },
        ),
      );
      cleanups.push(
        subscribeTeamDescriptions(
          (data) => {
            setDescriptionsCsv(data?.csv ?? "");
            markStreamReady("descriptions", streamsSeen, streamFinished);
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            markStreamReady("descriptions", streamsSeen, streamFinished);
          },
        ),
      );
      cleanups.push(
        subscribeTeamDiscord(
          (data) => {
            setDiscordCsv(data?.csv ?? "");
            markStreamReady("discord", streamsSeen, streamFinished);
          },
          (err) => {
            setError((prev) => prev ?? err.message);
            markStreamReady("discord", streamsSeen, streamFinished);
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
    } catch {
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
