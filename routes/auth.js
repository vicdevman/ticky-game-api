import { Router } from "express";
import {
  register,
  login,
  getMe,
  getUserById,
  checkUnique,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// =========================
// REGISTER
// =========================
router.post("/register", register);

// =========================
// LOGIN
// =========================
router.post("/login", login);

// =========================
// USER DATA
// =========================
router.get("/me", auth, getMe);

router.get("/user/:id", auth, getUserById);

router.post("/checkdata", checkUnique);

export default router;
