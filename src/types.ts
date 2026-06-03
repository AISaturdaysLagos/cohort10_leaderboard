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
