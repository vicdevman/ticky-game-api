import db from "../db/db.js";

export const Training = {
  async logGame({ userId, mode, difficulty, result, duration, playedAt }) {
    return await db`
      INSERT INTO training_history (
        user_id,
        mode,
        difficulty,
        result,
        duration,
        played_at
      )
      VALUES (
        ${userId},
        ${mode},
        ${difficulty},
        ${result},
        ${duration},
        ${playedAt}
      )
      RETURNING *
    `;
  },

  async getStats(userId) {
    return await db`
      SELECT 
        difficulty,
        result,
        COUNT(*) as count
      FROM training_history
      WHERE user_id = ${userId}
      GROUP BY difficulty, result
    `;
  },
};
