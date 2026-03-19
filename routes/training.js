import { Router } from "express";
import {
  logTrainingSession,
  getTrainingStats,
} from "../controllers/trainingController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// All training routes are protected
router.use(auth);

router.post("/log", logTrainingSession);
router.get("/stats", getTrainingStats);

export default router;
