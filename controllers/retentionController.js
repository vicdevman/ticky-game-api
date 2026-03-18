import { User } from "../models/user.js";
import { emailService } from "../services/emailService.js";

export const processInactiveReminders = async (req, res) => {
  try {
    const inactiveUsers = await User.findInactiveUsers(7);

    console.log(`Found ${inactiveUsers.length} inactive users to remind.`);

    const results = {
      total: inactiveUsers.length,
      sent: 0,
      failed: 0,
    };

    const emailPromises = inactiveUsers.map(async (user) => {
      try {
        await emailService.sendRetentionReminder(user.email, user.username);
        await User.updateReminderSentAt(user.id);
        results.sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${user.email}:`, err);
        results.failed++;
      }
    });

    await Promise.all(emailPromises);

    res.status(200).json({
      ok: true,
      message: "Retention process completed",
      data: results,
    });
  } catch (err) {
    console.error("Error processing inactive reminders:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};
