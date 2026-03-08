import { Router } from "express";
import {
  getAllUsers,
  getOnlineUsers,
  getUserPublicProfile,
  updateMyProfile,
  deleteMyAccount,
  getLeaderboard,
} from "../controllers/userController.js";
import { auth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// Public routes
router.get("/", optionalAuth, getAllUsers);
router.get("/leaderboard", optionalAuth, getLeaderboard);
router.get("/online", auth, getOnlineUsers);
router.get("/:id", getUserPublicProfile);

// Protected routes
router.use(auth);
router.put("/profile", updateMyProfile);
router.delete("/account", deleteMyAccount);

export default router;
