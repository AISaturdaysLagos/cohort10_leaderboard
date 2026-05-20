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
  teamOfTheWeek: string | null;
  mostImproved: string | null;
  perfectAttendance: string | null;
  deepLearners: string | null;
  comebackTeam: string | null;
};

export type StoredWeekSnapshot = {
  weekId: string;
  weekLabel: string;
  scores: Record<string, number>;
  savedAt: string;
};
