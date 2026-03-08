import db from "../db/db.js";

export const Game = {
  async saveGameResult({ userId, myScore, opponentScore, winner, type }) {
    // Insert result
    await db`
      INSERT INTO game_history (
        user_id,
        my_score,
        opponent_score,
        winner,
        type
      )
      VALUES (
        ${userId},
        ${myScore},
        ${opponentScore},
        ${winner},
        ${type}
      )
    `;

    // Keep only latest 5
    await db`
      DELETE FROM game_history
      WHERE id NOT IN (
        SELECT id
        FROM game_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 5
      )
      AND user_id = ${userId}
    `;
  },

  async getUserHistory(userId) {
    return await db`
      SELECT *
      FROM game_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 5
    `;
  },
};
