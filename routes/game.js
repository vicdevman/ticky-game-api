import {
  getMyGameSession,
  leaveGame,
  endSession,
  getGameHistory,
  getWaitingGames,
  getGameStatus,
} from "../controllers/gameController.js";
import { auth } from "../middleware/auth.js";
import { Router } from "express";

const router = Router();

// GET /api/v1/game/session — check if user is in an active game
router.get("/session", auth, getMyGameSession);
router.post("/leave", auth, leaveGame);
router.post("/end", auth, endSession);
router.get("/history/:id", auth, getGameHistory);
router.get("/waiting", getWaitingGames);
router.get("/status/:gameId", getGameStatus);

export default router;
