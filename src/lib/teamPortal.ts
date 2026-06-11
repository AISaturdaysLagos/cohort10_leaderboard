import type { TeamAssignmentRow, TeamDescription, TeamDiscordLink, TeamMemberProfile, TeamPortalContext, TeamPortalMember } from "../types";
import { canonicalizeEmailForMatch, groupTeams, normalizeEmail } from "./teamAssignments";
import { findTeamDiscordLink } from "./teamDiscord";
import { formatMemberName, isTeamLeaderRole, profileForEmail, sortMembersByProfile } from "./teamLeaders";

function findDescription(
  descriptions: Map<string, TeamDescription>,
  teamId: string,
  teamName: string,
): TeamDescription | null {
  return descriptions.get(teamId) ?? descriptions.get(teamName.toLowerCase()) ?? null;
}

function toPortalMember(email: string, profiles: Map<string, TeamMemberProfile>): TeamPortalMember {
  const profile = profileForEmail(profiles, email);
  return {
    email: normalizeEmail(email),
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
  const key = canonicalizeEmailForMatch(email);
  const assignment = assignments.find((r) => canonicalizeEmailForMatch(r.email) === key);
  if (!assignment) return null;

  const profile = profileForEmail(profiles, email) ?? null;
  const isLeader = profile ? isTeamLeaderRole(profile.role) : false;
  const description = findDescription(descriptions, assignment.teamId, assignment.teamName);
  const discord = findTeamDiscordLink(discordLinks, assignment.teamId, assignment.teamName);
  const members = isLeader ? buildTeamRoster(assignment.teamId, assignments, profiles) : [];

  return {
    email: normalizeEmail(assignment.email),
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
    ? normalizeEmail(options.previewEmail)
    : group.members.find((m) => isTeamLeaderRole(profileForEmail(profiles, m)?.role ?? "")) ?? group.members[0];

  const profile = previewEmail ? (profileForEmail(profiles, previewEmail) ?? null) : null;

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
