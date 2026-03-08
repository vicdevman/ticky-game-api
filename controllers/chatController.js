import { Chat } from "../models/chat.js";

export const createConversation = async (req, res) => {
  const { user2Id } = req.body;
  const user1Id = req.user.id;
  
  try {
    const conversation = await Chat.createDirectConversation(user1Id, user2Id);
    res
      .status(200)
      .json({
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
    res.status(200).json({ message: "Messages fetched", messages, ok: true });
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
    res.status(200).json({ message: "Marked as read", ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
