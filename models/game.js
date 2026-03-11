import db from "../db/db.js";

export const Game = {
  async saveGameResult({
    userId,
    opponentId,
    myScore,
    opponentScore,
    winner,
    type,
  }) {
    // Insert result
    await db`
      INSERT INTO game_history (
        user_id,
        opponent_id,
        my_score,
        opponent_score,
        winner,
        type
      )
      VALUES (
        ${userId},
        ${opponentId},
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
      SELECT
        gh.id,
        gh.user_id,
        gh.opponent_id,
        gh.my_score,
        gh.opponent_score,
        gh.winner,
        gh.type,
        gh.created_at,
        u.username AS opponent_username,
        u.avatar_url AS opponent_avatar_url,
        u.xp AS opponent_xp
      FROM game_history gh
      LEFT JOIN users u ON u.id = gh.opponent_id
      WHERE gh.user_id = ${userId}
      ORDER BY gh.created_at DESC
      LIMIT 5
    `;
  },
};
