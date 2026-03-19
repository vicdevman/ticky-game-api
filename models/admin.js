import db from "../db/db.js";

export const Admin = {
  async getOverallStats() {
    const [stats] = await db`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM training_history) as total_ai_games,
        (SELECT COUNT(*) FROM game_history) as total_pvp_games,
        (SELECT SUM(total_games) FROM users) as total_matches_played,
        (SELECT COUNT(*) FROM conversation_participants) as total_active_chats
    `;
    return stats;
  },

  async getActiveGamesData(redis) {
    // We scan redis for active game sessions
    const keys = await redis.keys("game:*");
    // Filter out participant keys
    const gameKeys = keys.filter(
      (k) =>
        !k.includes(":participants") &&
        !k.includes(":participant") &&
        !k.includes("logs"),
    );

    const games = await Promise.all(
      gameKeys.map(async (key) => {
        const gameRaw = await redis.get(key);
        if (!gameRaw) return null;
        const game = JSON.parse(gameRaw);
        const gameId = key.split(":")[1];
        const participantsRaw = await redis.sMembers(
          `game:${gameId}:participants`,
        );

        const participants = await Promise.all(
          participantsRaw.map(async (pid) => {
            const pRaw = await redis.get(`game:participant:${pid}`);
            return pRaw ? JSON.parse(pRaw) : { userId: pid };
          }),
        );

        return { ...game, participants };
      }),
    );

    return games.filter(Boolean);
  },

  async getOnlineUsersDetailed(userIds) {
    if (!userIds || userIds.length === 0) return [];

    return await db`
      SELECT id, username, email, xp, total_games, created_at, last_seen_at, role
      FROM users
      WHERE id = ANY(${userIds})
    `;
  },

  async getUsersWithFilters({
    difficulty,
    result,
    search,
    limit = 50,
    offset = 0,
  }) {
    // Handle empty filters in JS to pass NULL to the DB
    // This prevents JS from concatenating "undefined" into the LIKE pattern
    const searchVal = search ? `%${search}%` : null;
    const difficultyVal = difficulty || null;
    const resultVal = result || null;

    const query = db`
      SELECT DISTINCT 
        u.id, u.username, u.email, u.xp, u.role, u.created_at, u.last_seen_at
      FROM users u
      LEFT JOIN training_history th ON th.user_id = u.id
      WHERE 
        (${searchVal}::text IS NULL OR u.username ILIKE ${searchVal} OR u.email ILIKE ${searchVal})
        AND (${difficultyVal}::text IS NULL OR th.difficulty = ${difficultyVal})
        AND (${resultVal}::text IS NULL OR th.result = ${resultVal})
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return await query;
  },

  async getTrafficMetrics(days = 7) {
    return await db`
      SELECT 
        path, 
        method, 
        COUNT(*) as hits, 
        AVG(duration_ms)::INTEGER as avg_duration,
        MAX(status) as last_status
      FROM route_metrics
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
      GROUP BY path, method
      ORDER BY hits DESC
    `;
  },

  async getAiAnalytics() {
    return await db`
      SELECT 
        difficulty, 
        result, 
        COUNT(*) as count
      FROM training_history
      GROUP BY difficulty, result
      ORDER BY difficulty, result
    `;
  },
};
