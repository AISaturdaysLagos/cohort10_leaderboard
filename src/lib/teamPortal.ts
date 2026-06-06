import type { TeamAssignmentRow, TeamDescription, TeamDiscordLink, TeamMemberProfile, TeamPortalContext, TeamPortalMember } from "../types";
import { canonicalizeEmailForMatch, groupTeams } from "./teamAssignments";
import { findTeamDiscordLink } from "./teamDiscord";
import { formatMemberName, isTeamLeaderRole, sortMembersByProfile } from "./teamLeaders";

function normEmail(email: string): string {
  return canonicalizeEmailForMatch(email);
}

function findDescription(
  descriptions: Map<string, TeamDescription>,
  teamId: string,
  teamName: string,
): TeamDescription | null {
  return descriptions.get(teamId) ?? descriptions.get(teamName.toLowerCase()) ?? null;
}

function toPortalMember(email: string, profiles: Map<string, TeamMemberProfile>): TeamPortalMember {
  const profile = profiles.get(normEmail(email));
  return {
    email: normEmail(email),
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    role: profile?.role ?? "",
    leaderRank: profile?.leaderRank ?? null,
  };
}

export function buildTeamRoster(
  teamId: string,
  assignments: TeamAssignmentRow[],
  profiles: Map<string, TeamMemberProfile>,
): TeamPortalMember[] {
  const groups = groupTeams(assignments);
  const group = groups.find((g) => g.teamId === teamId);
  if (!group) return [];
  const sorted = sortMembersByProfile(group.members, profiles);
  return sorted.map((email) => toPortalMember(email, profiles));
}

export function resolveTeamPortal(
  email: string,
  assignments: TeamAssignmentRow[],
  profiles: Map<string, TeamMemberProfile>,
  descriptions: Map<string, TeamDescription>,
  discordLinks: Map<string, TeamDiscordLink>,
): TeamPortalContext | null {
  const key = normEmail(email);
  const assignment = assignments.find((r) => r.email === key);
  if (!assignment) return null;

  const profile = profiles.get(key) ?? null;
  const isLeader = profile ? isTeamLeaderRole(profile.role) : false;
  const description = findDescription(descriptions, assignment.teamId, assignment.teamName);
  const discord = findTeamDiscordLink(discordLinks, assignment.teamId, assignment.teamName);
  const members = isLeader ? buildTeamRoster(assignment.teamId, assignments, profiles) : [];

  return {
    email: key,
    teamId: assignment.teamId,
    teamName: assignment.teamName,
    description,
    discord,
    profile,
    isLeader,
    members,
  };
}

export function resolveTeamPortalForTeam(
  teamId: string,
  assignments: TeamAssignmentRow[],
  profiles: Map<string, TeamMemberProfile>,
  descriptions: Map<string, TeamDescription>,
  discordLinks: Map<string, TeamDiscordLink>,
  options: { asLeader: boolean; previewEmail?: string },
): TeamPortalContext | null {
  const groups = groupTeams(assignments);
  const group = groups.find((g) => g.teamId === teamId);
  if (!group) return null;

  const description = findDescription(descriptions, group.teamId, group.teamName);
  const discord = findTeamDiscordLink(discordLinks, group.teamId, group.teamName);
  const previewEmail = options.previewEmail
    ? normEmail(options.previewEmail)
    : group.members.find((m) => isTeamLeaderRole(profiles.get(m)?.role ?? "")) ?? group.members[0];

  const profile = previewEmail ? (profiles.get(previewEmail) ?? null) : null;

  return {
    email: previewEmail ?? "",
    teamId: group.teamId,
    teamName: group.teamName,
    description,
    discord,
    profile,
    isLeader: options.asLeader,
    members: options.asLeader ? buildTeamRoster(group.teamId, assignments, profiles) : [],
  };
}

export function listTeamsForPortal(assignments: TeamAssignmentRow[]): { teamId: string; teamName: string; memberCount: number }[] {
  return groupTeams(assignments).map((g) => ({
    teamId: g.teamId,
    teamName: g.teamName,
    memberCount: g.members.length,
  }));
}

export function displayMemberName(member: TeamPortalMember): string {
  const name = [member.firstName, member.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  return name || member.email;
}

export { formatMemberName };
