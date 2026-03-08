import { Router } from "express";
import {
  createConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/chatController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// All chat routes are protected
router.use(auth);

// Conversations
router.post("/conversations", createConversation);
router.get("/conversations", getUserConversations);

// Messages
router.get("/messages/:conversationId", getMessages);
router.post("/messages", sendMessage);
router.post("/messages/:conversationId/read", markAsRead);

export default router;
