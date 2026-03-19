import db from "../db/db.js";

export const trafficLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const status = res.statusCode;
    const userId = req.user?.id || null;

    // Fire and forget (don't block response)
    db`
      INSERT INTO route_metrics (path, method, status, duration_ms, user_id)
      VALUES (${originalUrl}, ${method}, ${status}, ${duration}, ${userId})
    `.catch((err) => console.error("Traffic logging error:", err.message));
  });

  next();
};
