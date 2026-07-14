import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { generateDailySequence } from '../../shared/sequence';
import type {
  InitResponse,
  ScoreRequest,
  ScoreResponse,
  AwardFlairResponse,
  RaidRequest,
  RaidResponse
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

// Helper to compute and update the daily top 10 streak
async function updateAndGetTop10Streak(
  subredditName: string,
  username: string,
  todayStr: string,
  yesterdayStr: string
): Promise<number> {
  const streakKey = `streak:top10:${subredditName}:${username}`;
  const lastDateKey = `streak:top10_last_date:${subredditName}:${username}`;
  const streakLeaderboardKey = `leaderboard:streaks:${subredditName}`;

  const streakVal = await redis.get(streakKey);
  let streak = streakVal ? parseInt(streakVal, 10) : 0;
  const lastDate = (await redis.get(lastDateKey)) || '';

  // Get rank in today's daily leaderboard
  const todayRank = await redis.zRank(`leaderboard:${subredditName}:${todayStr}`, username);
  const todayTotal = await redis.zCard(`leaderboard:${subredditName}:${todayStr}`);
  const isTop10Today = todayRank !== undefined && (todayTotal - todayRank) <= 10;

  // Get rank in yesterday's daily leaderboard
  const yesterdayRank = await redis.zRank(`leaderboard:${subredditName}:${yesterdayStr}`, username);
  const yesterdayTotal = await redis.zCard(`leaderboard:${subredditName}:${yesterdayStr}`);
  const wasTop10Yesterday = yesterdayRank !== undefined && (yesterdayTotal - yesterdayRank) <= 10;

  if (isTop10Today) {
    if (lastDate === todayStr) {
      // Already updated for today, do nothing
    } else if (lastDate === yesterdayStr && wasTop10Yesterday) {
      // Maintained the streak from yesterday
      streak += 1;
      await redis.set(streakKey, streak.toString());
      await redis.set(lastDateKey, todayStr);
      await redis.zAdd(streakLeaderboardKey, { member: username, score: streak });
    } else {
      // New streak started today
      streak = 1;
      await redis.set(streakKey, '1');
      await redis.set(lastDateKey, todayStr);
      await redis.zAdd(streakLeaderboardKey, { member: username, score: 1 });
    }
  } else {
    // Not in top 10 today (yet)
    // If last date isn't today or yesterday, the streak is broken
    if (lastDate !== todayStr && lastDate !== yesterdayStr) {
      streak = 0;
      await redis.set(streakKey, '0');
      await redis.set(lastDateKey, '');
      await redis.zRem(streakLeaderboardKey, [username]);
    }
  }

  return streak;
}

api.get('/init', async (c) => {
  const { postId, subredditName } = context;

  if (!postId || !subredditName) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId and subredditName are required but missing from context',
      },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0] || ''; // "YYYY-MM-DD"

    // Get current date string (UTC) for daily seed
    const dailySeed = parseInt(dateStr.replace(/-/g, ''), 10) || 20260701;

    // Read the current top-10 daily streak
    const streakKey = `streak:top10:${subredditName}:${username}`;
    const top10StreakVal = await redis.get(streakKey);
    let top10Streak = top10StreakVal ? parseInt(top10StreakVal, 10) : 0;
    const lastDateKey = `streak:top10_last_date:${subredditName}:${username}`;
    const lastDate = (await redis.get(lastDateKey)) || '';

    // Expire streak if last active date is before yesterday
    const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0] || '';
    if (lastDate && lastDate !== dateStr && lastDate !== yesterdayStr) {
      top10Streak = 0;
      await redis.set(streakKey, '0');
      await redis.set(lastDateKey, '');
      await redis.zRem(`leaderboard:streaks:${subredditName}`, [username]);
    }

    // Get unlocked badges
    const badgeKey = `badges:${subredditName}:${username}`;
    const badgesVal = await redis.get(badgeKey);
    const unlockedBadges = badgesVal ? badgesVal.split(',').filter(Boolean) : [];

    // Get unlocked tiers (progress tracker), persisted server-side
    const progressKey = `progress:${subredditName}:${username}`;
    const progressVal = await redis.get(progressKey);
    const unlockedTiers = progressVal ? progressVal.split(',').map((b) => b === '1') : [];

    // Get high score
    const highScoreKey = `score:${subredditName}:${username}`;
    const highScoreVal = await redis.get(highScoreKey);
    const highScore = highScoreVal ? parseInt(highScoreVal, 10) : 0;

    // Generate 500 deterministic drops
    const sequence = generateDailySequence(dailySeed);

    // Calculate player standings (Daily Rank, Daily Score, Streak Rank, Global Rank, Global Percentile)
    const dailyLeaderboardKey = `leaderboard:${subredditName}:${dateStr}`;
    const todayRankRaw = await redis.zRank(dailyLeaderboardKey, username);
    const todayTotal = await redis.zCard(dailyLeaderboardKey);
    const todayScoreRaw = await redis.zScore(dailyLeaderboardKey, username);
    const dailyScore = todayScoreRaw ? Math.round(todayScoreRaw) : 0;
    let dailyRank: number | undefined;
    if (todayRankRaw !== undefined && todayTotal > 0) {
      dailyRank = todayTotal - todayRankRaw;
    }

    const streakLeaderboardKey = `leaderboard:streaks:${subredditName}`;
    const streakRankRaw = await redis.zRank(streakLeaderboardKey, username);
    const streakTotal = await redis.zCard(streakLeaderboardKey);
    let streakRank: number | undefined;
    if (streakRankRaw !== undefined && streakTotal > 0) {
      streakRank = streakTotal - streakRankRaw;
    }

    const globalLeaderboardKey = 'leaderboard:global';
    const globalRankRaw = await redis.zRank(globalLeaderboardKey, username);
    const globalTotal = await redis.zCard(globalLeaderboardKey);
    let rank: number | undefined;
    let percentile: number | undefined;
    if (globalRankRaw !== undefined && globalTotal > 0) {
      const descendingRank = globalTotal - globalRankRaw;
      if (descendingRank <= 100) {
        rank = descendingRank;
      } else {
        percentile = Math.max(1, Math.ceil((descendingRank / globalTotal) * 100));
      }
    }

    // Get local daily leaderboard (top 100) and fetch streaks
    const leaderboardRaw = await redis.zRange(dailyLeaderboardKey, 0, 99, {
      reverse: true,
      by: 'rank',
    });

    const leaderboard = [];
    if (leaderboardRaw) {
      const streakPromises = leaderboardRaw.map((entry) =>
        redis.get(`streak:top10:${subredditName}:${entry.member}`)
      );
      const streaks = await Promise.all(streakPromises);
      for (let i = 0; i < leaderboardRaw.length; i++) {
        const entry = leaderboardRaw[i];
        if (entry) {
          leaderboard.push({
            username: entry.member,
            score: Math.round(entry.score),
            top10Streak: streaks[i] ? parseInt(streaks[i] as string, 10) : 0,
          });
        }
      }
    }

    // Get global leaderboard (top 100) and fetch streaks
    const globalLeaderboardRaw = await redis.zRange(globalLeaderboardKey, 0, 99, {
      reverse: true,
      by: 'rank',
    });

    const globalLeaderboard = [];
    if (globalLeaderboardRaw) {
      const globalStreakPromises = globalLeaderboardRaw.map((entry) =>
        redis.get(`streak:top10:${subredditName}:${entry.member}`)
      );
      const globalStreaks = await Promise.all(globalStreakPromises);
      for (let i = 0; i < globalLeaderboardRaw.length; i++) {
        const entry = globalLeaderboardRaw[i];
        if (entry) {
          globalLeaderboard.push({
            username: entry.member,
            score: Math.round(entry.score),
            top10Streak: globalStreaks[i] ? parseInt(globalStreaks[i] as string, 10) : 0,
          });
        }
      }
    }

    // Get streak leaderboard (top 100)
    const streakLeaderboardRaw = await redis.zRange(streakLeaderboardKey, 0, 99, {
      reverse: true,
      by: 'rank',
    });

    const streakLeaderboard = (streakLeaderboardRaw || []).map((entry) => ({
      username: entry.member,
      streak: Math.round(entry.score),
    }));

    // Get subreddit war score
    const subredditWarScoreVal = await redis.zScore('global_war_leaderboard', subredditName);
    const subredditWarScore = subredditWarScoreVal ? Math.round(subredditWarScoreVal) : 0;

    // Get global war leaderboard
    const globalWarRaw = await redis.zRange('global_war_leaderboard', 0, 9, {
      reverse: true,
      by: 'rank',
    });

    const globalWarLeaderboard = (globalWarRaw || []).map((entry: { member: string; score: number }) => ({
      subredditName: entry.member,
      score: Math.round(entry.score),
    }));

    // Check if we are raided
    const raidKey = `raids:${subredditName}`;
    const raidsVal = await redis.get(raidKey);
    const activeRaids = raidsVal ? raidsVal.split(',') : [];
    if (activeRaids.length > 0) {
      // Clear raids so they only apply to this session
      await redis.del(raidKey);
    }

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username,
      subredditName,
      dailySeed,
      sequence,
      highScore,
      leaderboard,
      globalLeaderboard,
      streakLeaderboard,
      subredditWarScore,
      globalWarLeaderboard,
      activeRaids,
      top10Streak,
      unlockedBadges,
      unlockedTiers,
      rank,
      percentile,
      dailyRank,
      dailyScore,
      streakRank,
    });
  } catch (error) {
    console.error(`API Init Error:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      400
    );
  }
});

api.post('/score', async (c) => {
  const { subredditName } = context;
  if (!subredditName) {
    return c.json<ErrorResponse>({ status: 'error', message: 'subredditName missing' }, 400);
  }

  try {
    const { score, unlockedTiers } = (await c.req.json()) as ScoreRequest;
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';

    // Update personal best
    const highScoreKey = `score:${subredditName}:${username}`;
    const oldHighScoreVal = await redis.get(highScoreKey);
    const oldHighScore = oldHighScoreVal ? parseInt(oldHighScoreVal, 10) : 0;
    
    let newHighScore = false;
    let personalBest = oldHighScore;
    if (score > oldHighScore) {
      await redis.set(highScoreKey, score.toString());
      personalBest = score;
      newHighScore = true;
    }

    // Add to daily leaderboard (best run of the day, not cumulative, to keep the
    // top-10 streak fair and ungrindable)
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0] || '';
    const leaderboardKey = `leaderboard:${subredditName}:${dateStr}`;
    const oldDailyScoreVal = await redis.zScore(leaderboardKey, username);
    const oldDailyScore = oldDailyScoreVal ? Math.round(oldDailyScoreVal) : 0;
    if (score > oldDailyScore) {
      await redis.zAdd(leaderboardKey, { member: username, score: score });
    }

    // Add to global Subreddit War score
    await redis.zIncrBy('global_war_leaderboard', subredditName, score);

    // Update global all-time leaderboard and calculate rank/percentile
    const globalLeaderboardKey = 'leaderboard:global';
    const oldGlobalScoreVal = await redis.zScore(globalLeaderboardKey, username);
    const oldGlobalScore = oldGlobalScoreVal ? Math.round(oldGlobalScoreVal) : 0;
    if (score > oldGlobalScore) {
      await redis.zAdd(globalLeaderboardKey, { member: username, score: score });
    }

    const ascendingRank = await redis.zRank(globalLeaderboardKey, username);
    const totalPlayers = await redis.zCard(globalLeaderboardKey);

    let rank: number | undefined;
    let percentile: number | undefined;

    if (ascendingRank !== undefined && totalPlayers > 0) {
      const descendingRank = totalPlayers - ascendingRank; // 1-indexed
      if (descendingRank <= 100) {
        rank = descendingRank;
      } else {
        percentile = Math.max(1, Math.ceil((descendingRank / totalPlayers) * 100));
      }
    }

    // Process newly unlocked badges
    const badgeKey = `badges:${subredditName}:${username}`;
    const badgesVal = await redis.get(badgeKey);
    const badgeList = badgesVal ? badgesVal.split(',').filter(Boolean) : [];
    let badgesUpdated = false;
    const badgeNames = ['🥉 Veteran Merger', '🥈 Master Merger', '🥇 Legendary Merger', '🌌 Transcendent Master'];

    if (unlockedTiers && Array.isArray(unlockedTiers)) {
      for (let i = 0; i < 4; i++) {
        const tierIdx = 8 + i; // Tiers 9, 10, 11, 12 (indexes 8, 9, 10, 11)
        const badgeName = badgeNames[i];
        if (badgeName && unlockedTiers[tierIdx] && !badgeList.includes(badgeName)) {
          badgeList.push(badgeName);
          badgesUpdated = true;
        }
      }
    }
    if (badgesUpdated) {
      await redis.set(badgeKey, badgeList.join(','));
    }

    // Persist unlocked tiers (progress tracker) server-side
    if (unlockedTiers && Array.isArray(unlockedTiers)) {
      const progressKey = `progress:${subredditName}:${username}`;
      await redis.set(progressKey, unlockedTiers.map((b) => (b ? '1' : '0')).join(','));
    }

    // Compute top 10 daily streaks
    const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0] || '';
    const top10Streak = await updateAndGetTop10Streak(subredditName, username, dateStr, yesterdayStr);

    return c.json<ScoreResponse>({
      status: 'success',
      personalBest,
      newHighScore,
      rank,
      percentile,
      top10Streak,
      unlockedBadges: badgeList,
    });
  } catch (error) {
    console.error(`API Score Error:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      400
    );
  }
});

api.post('/award-flair', async (c) => {
  const { subredditName } = context;
  if (!subredditName) {
    return c.json<ErrorResponse>({ status: 'error', message: 'subredditName missing' }, 400);
  }

  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 400);
    }

    // Retrieve unlocked badges
    const badgeKey = `badges:${subredditName}:${username}`;
    const badgesVal = await redis.get(badgeKey);
    const badgeList = badgesVal ? badgesVal.split(',').filter(Boolean) : [];

    let flairText = '';
    if (badgeList.includes('🌌 Transcendent Master')) {
      flairText = '🌌 Transcendent Master';
    } else if (badgeList.includes('🥇 Legendary Merger')) {
      flairText = '🥇 Legendary Merger';
    } else if (badgeList.includes('🥈 Master Merger')) {
      flairText = '🥈 Master Merger';
    } else if (badgeList.includes('🥉 Veteran Merger')) {
      flairText = '🥉 Veteran Merger';
    } else {
      return c.json<ErrorResponse>({ 
        status: 'error', 
        message: 'You have not unlocked any legendary badges yet! Merge items to Tier 10+ to get a flair.' 
      }, 400);
    }

    // Award User Flair
    await reddit.setUserFlair({
      subredditName,
      username,
      text: flairText,
    });

    return c.json<AwardFlairResponse>({
      status: 'success',
      flairText: flairText,
    });
  } catch (error) {
    console.error(`API Award Flair Error:`, error);
    return c.json<AwardFlairResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Flair update failed',
    });
  }
});

api.post('/raid', async (c) => {
  const { subredditName } = context;
  if (!subredditName) {
    return c.json<ErrorResponse>({ status: 'error', message: 'subredditName missing' }, 400);
  }

  try {
    const { targetSubreddit } = (await c.req.json()) as RaidRequest;
    
    // Save the raid trap in target subreddit's active raid queue
    const raidKey = `raids:${targetSubreddit}`;
    const currentRaids = await redis.get(raidKey);
    const raidList = currentRaids ? currentRaids.split(',') : [];
    
    if (!raidList.includes(subredditName)) {
      raidList.push(subredditName);
      await redis.set(raidKey, raidList.join(','));
    }

    return c.json<RaidResponse>({
      status: 'success',
    });
  } catch (error) {
    console.error(`API Raid Error:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      400
    );
  }
});
