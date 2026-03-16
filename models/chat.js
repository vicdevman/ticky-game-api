// models/chat.js
import db from "../db/db.js";

export const Chat = {
  // =========================
  // CREATE DIRECT CONVERSATION
  // =========================
  async createDirectConversation(user1Id, user2Id) {
    // Check if already exists
    const existing = await db`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 
        ON cp1.conversation_id = c.id
      JOIN conversation_participants cp2 
        ON cp2.conversation_id = c.id
      WHERE c.type = 'direct'
        AND cp1.user_id = ${user1Id}
        AND cp2.user_id = ${user2Id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    const conversation = await db`
      INSERT INTO conversations (type, created_by)
      VALUES ('direct', ${user1Id})
      RETURNING id
    `;

    const conversationId = conversation[0].id;

    await db`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES 
        (${conversationId}, ${user1Id}),
        (${conversationId}, ${user2Id})
    `;

    return { id: conversationId };
  },

  // =========================
  // GET USER CONVERSATIONS
  // =========================
  async getUserConversations(userId) {
    return await db`
      SELECT 
        c.id,
        c.type,
        c.updated_at,

        u.id AS other_user_id,
        u.username AS other_username,
        u.avatar_url AS other_avatar,

        m.id AS last_message_id,
        m.content AS last_message,
        m.created_at AS last_message_time,

        (
          SELECT COUNT(*)
          FROM messages msg
          WHERE msg.conversation_id = c.id
          AND msg.id > cp.last_read_message_id
        ) AS unread_count

      FROM conversations c

      JOIN conversation_participants cp
        ON cp.conversation_id = c.id

      JOIN conversation_participants cp2
        ON cp2.conversation_id = c.id
        AND cp2.user_id != ${userId}

      JOIN users u
        ON u.id = cp2.user_id

      LEFT JOIN LATERAL (
        SELECT id, content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY id DESC
        LIMIT 1
      ) m ON true

      WHERE cp.user_id = ${userId}
        AND cp.left_at IS NULL

      ORDER BY c.updated_at DESC
    `;
  },

  // =========================
  // GET MESSAGES (PAGINATED)
  // =========================
  async getMessages(conversationId, limit = 30, cursor = null) {
    if (cursor) {
      return await db`
        SELECT *
        FROM messages
        WHERE conversation_id = ${conversationId}
          AND id < ${cursor}
        ORDER BY id DESC
        LIMIT ${limit}
      `;
    }

    return await db`
      SELECT *
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY id DESC
      LIMIT ${limit}
    `;
  },

  // =========================
  // SEND MESSAGE
  // =========================
  async sendMessage({
    conversationId,
    senderId,
    content,
    messageType = "text",
    replyTo = null,
  }) {
    const message = await db`
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_message_id
      )
      VALUES (
        ${conversationId},
        ${senderId},
        ${content},
        ${messageType},
        ${replyTo}
      )
      RETURNING *
    `;

    await db`
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = ${conversationId}
    `;

    return message[0];
  },

  // =========================
  // MARK AS READ
  // =========================
  async markAsRead(conversationId, userId, messageId) {
    await db`
      UPDATE conversation_participants
      SET last_read_message_id = ${messageId}
      WHERE conversation_id = ${conversationId}
        AND user_id = ${userId}
    `;
  },

  // =========================
  // UPDATE MESSAGE CONTENT
  // =========================
  async updateMessageContent(messageId, newContent) {
    await db`
      UPDATE messages
      SET content = ${newContent}
      WHERE id = ${messageId}
    `;
  },

  // =========================
  // MARK INVITE AS FINISHED
  // =========================
  async markInviteAsFinished(gameId) {
    const pattern = `[GAME_INVITE]:${gameId}:%`;
    const newContent = `[GAME_INVITE]:${gameId}:FINISHED`;

    await db`
      UPDATE messages
      SET content = ${newContent}
      WHERE content LIKE ${pattern}
    `;
  },
};
