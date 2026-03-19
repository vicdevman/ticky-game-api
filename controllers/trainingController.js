import { Training } from "../models/training.js";
import { User } from "../models/user.js";
import { redis } from "../db/cache.js";

const XP_MAP = {
  easy: { win: 2, loss: 1, draw: 1 },
  medium: { win: 5, loss: 1, draw: 1 },
  hard: { win: 10, loss: 1, draw: 1 },
};

export const logTrainingSession = async (req, res) => {
  const { games } = req.body;
  const userId = req.user.id;

  if (!games || !Array.isArray(games)) {
    return res.status(400).json({ message: "Invalid games data", ok: false });
  }

  try {
    // 1. Rate Limit Check (100 logs per day)
    const dailyKey = `training:logs:count:day:${userId}`;
    const currentCount = await redis.get(dailyKey);

    if (currentCount && parseInt(currentCount) >= 100) {
      return res.status(429).json({
        message: "Daily training limit reached (100 games).",
        ok: false,
      });
    }

    let totalXPGained = 0;
    const logPromises = games.map(async (game) => {
      const { mode, difficulty, result, duration, playedAt } = game;

      // Calculate XP
      const xp = XP_MAP[difficulty]?.[result] || 1;
      totalXPGained += xp;

      return Training.logGame({
        userId,
        mode,
        difficulty,
        result,
        duration,
        playedAt,
      });
    });

    await Promise.all(logPromises);

    // 2. Update User XP and log count in Redis
    if (totalXPGained > 0) {
      await User.updateUserProgress(userId, totalXPGained, 0); // Increment XP but not total_games (which is for PvP)
    }

    // Update rate limit counter
    const newCount = await redis.incrBy(dailyKey, games.length);
    if (newCount === games.length) {
      await redis.expire(dailyKey, 86400); // 1 day
    }

    res.status(200).json({
      message: "Training sessions logged successfully",
      xpGained: totalXPGained,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getTrainingStats = async (req, res) => {
  const userId = req.user.id;

  try {
    const rawStats = await Training.getStats(userId);

    // Format stats for frontend
    const stats = rawStats.reduce((acc, curr) => {
      const { difficulty, result, count } = curr;
      if (!acc[difficulty]) {
        acc[difficulty] = { win: 0, loss: 0, draw: 0 };
      }
      acc[difficulty][result] = parseInt(count);
      return acc;
    }, {});

    res.status(200).json({
      message: "Training stats fetched",
      stats,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
