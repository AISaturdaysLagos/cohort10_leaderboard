import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setTeamMapCsv("");
      setLeadersCsv("");
      setDescriptionsCsv("");
      setDiscordCsv("");
      return;
    }

    setLoading(true);
    let pending = 4;
    const done = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    const unsubMap = subscribeTeamMap(
      (data) => {
        setTeamMapCsv(data?.csv ?? "");
        done();
      },
      (err) => {
        setError(err.message);
        done();
      },
    );
    const unsubLeaders = subscribeTeamLeaders(
      (data) => {
        setLeadersCsv(data?.csv ?? "");
        done();
      },
      (err) => {
        setError(err.message);
        done();
      },
    );
    const unsubDescriptions = subscribeTeamDescriptions(
      (data) => {
        setDescriptionsCsv(data?.csv ?? "");
        done();
      },
      (err) => {
        setError(err.message);
        done();
      },
    );
    const unsubDiscord = subscribeTeamDiscord(
      (data) => {
        setDiscordCsv(data?.csv ?? "");
        done();
      },
      (err) => {
        setError(err.message);
        done();
      },
    );

    return () => {
      unsubMap();
      unsubLeaders();
      unsubDescriptions();
      unsubDiscord();
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
    } catch {
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

  return { loading, error, assignments, profiles, descriptions, discordLinks };
}
