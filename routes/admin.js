import { Router } from "express";
import {
  adminLogin,
  getSystemDashboard,
  listUsers,
  deleteUser,
  adminForgotPassword,
  adminResetPassword,
  getActiveGames,
  getOnlineUsers,
} from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// Public Admin Auth
router.post("/login", adminLogin);
router.post("/forgot-password", adminForgotPassword);
router.post("/reset-password", adminResetPassword);

// Protected Admin Routes
router.use(adminAuth);

router.get("/dashboard", getSystemDashboard);
router.get("/users", listUsers);
router.delete("/users/:userId", deleteUser);
router.get("/active-games", getActiveGames);
router.get("/online-users", getOnlineUsers);

export default router;
