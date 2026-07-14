export interface LeaderboardEntry {
  username: string;
  score: number;
  top10Streak?: number;
}

export interface StreakLeaderboardEntry {
  username: string;
  streak: number;
}

export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
  subredditName: string;
  dailySeed: number;
  sequence: number[];
  highScore: number;
  leaderboard: LeaderboardEntry[];
  globalLeaderboard?: LeaderboardEntry[];
  streakLeaderboard?: StreakLeaderboardEntry[];
  subredditWarScore: number;
  globalWarLeaderboard: { subredditName: string; score: number }[];
  activeRaids?: string[];
  top10Streak?: number;
  unlockedBadges?: string[];
  unlockedTiers?: boolean[];
  rank?: number;
  percentile?: number;
  dailyRank?: number;
  dailyScore?: number;
  streakRank?: number;
};

export type ScoreRequest = {
  score: number;
  unlockedTiers?: boolean[];
};

export type ScoreResponse = {
  status: 'success' | 'error';
  personalBest: number;
  newHighScore: boolean;
  rank?: number;
  percentile?: number;
  message?: string;
  top10Streak?: number;
  unlockedBadges?: string[];
};

export type AwardFlairResponse = {
  status: 'success' | 'error';
  flairText?: string;
  message?: string;
};

export type RaidRequest = {
  targetSubreddit: string;
  cost: number;
};

export type RaidResponse = {
  status: 'success' | 'error';
  message?: string;
};
