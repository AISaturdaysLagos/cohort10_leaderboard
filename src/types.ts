export type ActivityRow = {
  member: string;
  activity: string;
  activityType: string;
  passed: boolean;
  givenScore: number | null;
  maximumScore: number | null;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  learningMinutes: number;
  parentName: string | null;
};

export type RosterRow = {
  email: string;
  team: string;
  status: "active" | "pending" | "other";
  lastActive: Date | null;
};

export type WeekBounds = { start: Date; end: Date };

export type TeamMetricBreakdown = {
  team: string;
  activeMembers: number;
  completedCount: number;
  completionRate: number;
  completionPoints: number;
  avgQuiz: number;
  quizPoints: number;
  participatedCount: number;
  participationRate: number;
  participationPoints: number;
  avgLearningMinutes: number;
  effortRatio: number;
  effortPoints: number;
  inactiveCount: number;
  consistencyRate: number;
  consistencyPoints: number;
  totalScore: number;
};

export type WeeklyAwards = {
  teamOfTheWeek: string[];
  mostImproved: string[];
  perfectAttendance: string[];
  deepLearners: string[];
  comebackTeam: string[];
};

export type PublishedLeaderboard = {
  version: 1;
  weekLabel: string;
  focalActivity: string;
  metrics: TeamMetricBreakdown[];
  awards: WeeklyAwards;
  publishedAt: string;
};

export type StoredWeekSnapshot = {
  weekId: string;
  weekLabel: string;
  scores: Record<string, number>;
  savedAt: string;
};

export type HistoryEntry = {
  id: string;
  weekLabel: string;
  focalActivity: string;
  metrics: TeamMetricBreakdown[];
  savedAt: string;
  /** Mentor email when saved via Firebase Auth. */
  savedBy?: string;
};

/** Shared email → team name map (Firestore `config/teamMap`). */
export type StoredTeamMap = {
  version: 1;
  csv: string;
  updatedAt: string;
  updatedBy?: string;
};

/** Shared admin scoreboard uploads (Firestore `config/adminDraft`). */
export type StoredAdminDraft = {
  version: 1;
  activityCsv: string;
  rosterCsv: string;
  activityFileName: string;
  rosterFileName: string;
  weekMondayIso: string;
  parentOverride: string;
  focalOverride: string;
  savedAt: string;
  updatedBy?: string;
};

/** One learner row in team_assignments_with_names.csv */
export type TeamAssignmentRow = {
  email: string;
  teamId: string;
  teamName: string;
};

/** Per-learner profile from team_leaders_assignment.csv (names, role, leader scores). */
export type TeamMemberProfile = {
  email: string;
  firstName: string;
  lastName: string;
  teamId: string;
  teamName: string;
  role: string;
  leaderRank: number | null;
  qualificationScore: number | null;
  leadershipNum: number | null;
  hoursNum: number | null;
  projNum: number | null;
  expScore: number | null;
};

/** Shared team leader profiles (Firestore `config/teamLeaders`). */
export type StoredTeamLeaders = {
  version: 1;
  csv: string;
  updatedAt: string;
  updatedBy?: string;
};

/** Shared team descriptions (Firestore `config/teamDescriptions`). */
export type StoredTeamDescriptions = {
  version: 1;
  csv: string;
  updatedAt: string;
  updatedBy?: string;
};

/** Shared team Discord channel links (Firestore `config/teamDiscord`). */
export type StoredTeamDiscord = {
  version: 1;
  csv: string;
  updatedAt: string;
  updatedBy?: string;
};

/** One row from team_descriptions.csv */
export type TeamDescription = {
  teamId: string;
  teamName: string;
  teamSize: number | null;
  category: string;
  overview: string;
  interestingDetails: string;
  imageUrl: string;
  imageSource: string;
};

/** One row from team_discord_channels.csv */
export type TeamDiscordLink = {
  teamId: string;
  teamName: string;
  channelUrl: string;
  inviteUrl: string;
  channelName: string;
};

/** Resolved team portal view for a signed-in learner or admin preview. */
export type TeamPortalMember = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  leaderRank: number | null;
};

export type TeamPortalContext = {
  email: string;
  teamId: string;
  teamName: string;
  description: TeamDescription | null;
  discord: TeamDiscordLink | null;
  profile: TeamMemberProfile | null;
  isLeader: boolean;
  members: TeamPortalMember[];
};

export type TeamGroup = {
  teamId: string;
  teamName: string;
  members: string[];
};

/** Per-learner activity signals for the selected week and focal course. */
export type MemberMetricBreakdown = {
  email: string;
  status: "active" | "pending" | "other" | "unmapped";
  participated: boolean;
  completed: boolean;
  bestQuiz: number | null;
  learningMinutes: number;
  lastActive: Date | null;
};
