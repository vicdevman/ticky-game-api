import { Router } from "express";
import { processInactiveReminders } from "../controllers/retentionController.js";

const router = Router();

router.get("/process-reminders", processInactiveReminders);

export default router;
