// models/user.js
import db from "../db/db.js";

export const User = {
  async findByUsernameOrEmail(identifier) {
    const result = await db`
      SELECT id, username, email, password_hash
      FROM users
      WHERE username = ${identifier}
         OR email = ${identifier}
      LIMIT 1
    `;

    return result[0] || null;
  },

  async exists(username, email) {
    const result = await db`
      SELECT 1
      FROM users
      WHERE username = ${username}
         OR email = ${email}
      LIMIT 1
    `;

    return result.length > 0;
  },

  async create({ username, email, password_hash }) {
    const result = await db`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username}, ${email}, ${password_hash})
      RETURNING id, username, email, xp, avatar_url, bio, total_games
    `;

    return result[0];
  },

  async findById(id) {
    const result = await db`
      SELECT id, username, email, avatar_url, bio, xp, total_games, last_seen_at, created_at
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `;

    return result[0] || null;
  },

  async updateUserProfile(userId, data) {
    const { username, avatarUrl, bio } = data;

    const [updatedUser] = await db`
    UPDATE users
    SET
      username = COALESCE(${username}, username),
      avatar_url = COALESCE(${avatarUrl}, avatar_url),
      bio = COALESCE(${bio}, bio),
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, username, avatar_url, bio, xp, total_games
  `;

    return updatedUser;
  },

  async updateUserProgress(userId, xpGain, totalGamesIncrement = 1) {
    const [updated] = await db`
    UPDATE users
    SET
      xp = xp + ${xpGain},
      total_games = total_games + ${totalGamesIncrement},
      xp_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING xp, total_games
  `;

    return updated;
  },

  async checkUnique(identifier) {
    const result = await db`
      SELECT 1
      FROM users
      WHERE username = ${identifier}
         OR email = ${identifier}
      LIMIT 1
    `;
    return result.length > 0;
  },

  async findAll(limit = 20, offset = 0) {
    return await db`
      SELECT id, username, avatar_url, xp, total_games, created_at
      FROM users
      ORDER BY xp DESC, xp_updated_at ASC, created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  },

  async getRankAndWins(id) {
    const [rankResult] = await db`
      WITH RankedUsers AS (
        SELECT id, RANK() OVER (ORDER BY xp DESC, xp_updated_at ASC, created_at ASC) as rank
        FROM users
      )
      SELECT rank FROM RankedUsers WHERE id = ${id}
    `;

    const [winsResult] = await db`
      SELECT COUNT(*) as total_wins
      FROM game_history
      WHERE user_id = ${id} AND winner = true
    `;

    return {
      rank: rankResult ? Number(rankResult.rank) : null,
      total_wins: winsResult ? Number(winsResult.total_wins) : 0,
    };
  },

  async delete(id) {
    await db`
      DELETE FROM users
      WHERE id = ${id}
    `;
  },

  async updatePassword(userId, password_hash) {
    await db`
      UPDATE users
      SET password_hash = ${password_hash}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  },

  async findInactiveUsers(days = 7) {
    return await db`
      SELECT id, email, username
      FROM users
      WHERE last_seen_at < (NOW() - INTERVAL '1 day' * ${days})
        AND (reminder_sent_at IS NULL OR reminder_sent_at < (NOW() - INTERVAL '1 day' * ${days}))
    `;
  },

  async updateReminderSentAt(userId) {
    await db`
      UPDATE users
      SET reminder_sent_at = NOW()
      WHERE id = ${userId}
    `;
  },
};
