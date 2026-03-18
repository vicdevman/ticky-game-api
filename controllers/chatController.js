import { Chat } from "../models/chat.js";
import { gameService } from "../services/game.js";
import { io } from "../server.js";
import { presenceService } from "../services/presence.js";
import { redis } from "../db/cache.js";

export const createConversation = async (req, res) => {
  const { user2Id } = req.body;
  const user1Id = req.user.id;

  console.log("callled with ------------------", { user1Id, user2Id });

  try {
    // Rate Limit Check for challenges (if it's a match flow)
    // For simplicity, we check if this user is initiating a lot of conversations in a short time
    // const hourlyKey = `challenges:count:hour:${user1Id}`;
    // const count = await redis.incr(hourlyKey);
    // if (count === 1) await redis.expire(hourlyKey, 3600);

    // if (count > 10) {
    //   return res.status(429).json({
    //     message: "Challenge limit reached. Please try again later.",
    //     ok: false,
    //     reason: "LIMIT_REACHED",
    //   });
    // }

    const conversation = await Chat.createDirectConversation(user1Id, user2Id);
    res.status(200).json({
      message: "Conversation created or found",
      conversation,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getUserConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    const conversations = await Chat.getUserConversations(userId);
    res
      .status(200)
      .json({ message: "Conversations fetched", conversations, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const { limit, cursor } = req.query;

  try {
    const messages = await Chat.getMessages(conversationId, limit, cursor);

    // Resolve Game Invitation Statuses
    const resolvedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (
          msg.content.startsWith("[GAME_INVITE]:") &&
          msg.content.endsWith(":ACTIVE")
        ) {
          const parts = msg.content.split(":");
          const gameCode = parts[1];
          const gameResult = await gameService.getGameDetails(gameCode);

          if (!gameResult.exist) {
            const newContent = `[GAME_INVITE]:${gameCode}:EXPIRED`;
            // Update in DB (fire and forget or await if you want consistency)
            Chat.updateMessageContent(msg.id, newContent).catch(console.error);
            return { ...msg, content: newContent };
          }
        }
        return msg;
      }),
    );

    res.status(200).json({
      message: "Messages fetched",
      messages: resolvedMessages,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const sendMessage = async (req, res) => {
  const { conversationId, content, messageType, replyTo } = req.body;
  const senderId = req.user.id;

  try {
    const message = await Chat.sendMessage({
      conversationId,
      senderId,
      content,
      messageType,
      replyTo,
    });
    res.status(201).json({ message: "Message sent", data: message, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const markAsRead = async (req, res) => {
  const { conversationId } = req.params;
  const { messageId } = req.body;
  const userId = req.user.id;

  try {
    await Chat.markAsRead(conversationId, userId, messageId);

    // Notify other participants
    const participants = await Chat.getConversationParticipants(conversationId);
    participants.forEach((p) => {
      if (p.user_id !== userId) {
        const socketId = presenceService.getSocketId(p.user_id);
        if (socketId) {
          io.to(socketId).emit("messages_read", { conversationId, userId });
        }
      }
    });

    res.status(200).json({ message: "Marked as read", ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getConversationPartner = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    const participants = await Chat.getConversationParticipants(conversationId);

    if (!participants || participants.length === 0) {
      return res
        .status(404)
        .json({ message: "Conversation not found", ok: false });
    }

    const isParticipant = participants.some((p) => p.user_id === userId);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Forbidden (User not in conversation)", ok: false });
    }

    const partner = await Chat.getConversationPartner(conversationId, userId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found", ok: false });
    }

    res.status(200).json({
      ok: true,
      partner,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
