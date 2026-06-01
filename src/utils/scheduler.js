import cron from "node-cron";
import Lead from "../models/lead.model.js";

// ─────────────────────────────────────────────
// Missed Follow-up Scheduler
// Runs every day at 00:00 (Midnight)
// ─────────────────────────────────────────────
export const startMissedFollowUpScheduler = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running Missed Follow-up Job...");
    try {
      const markedCount = await Lead.markMissedFollowUps();
      console.log(`[Scheduler] Marked ${markedCount} follow-ups as missed.`);
    } catch (error) {
      console.error("[Scheduler] Error marking missed follow-ups:", error);
    }
  });
  console.log("[Scheduler] Missed Follow-up Job Initialized.");
};
