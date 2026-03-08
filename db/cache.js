import { createClient } from "redis";
import "dotenv/config";

export const redis = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis max reconnection retries reached. stopping.");
        return new Error("Redis reconnection failed");
      }
      return Math.min(retries * 100, 3000); // Backoff strategy
    },
  },
});

redis.on("error", (err) => {
  console.error("Redis Client Error:", err.message);
});

redis.on("ready", () => {
  console.log("✅ Redis connected successfully");
});

// Use async IIFE to connect without blocking the module export if needed,
// though top-level await is fine in ES modules.
try {
  await redis.connect();
} catch (err) {
  console.error("Initial Redis connection failed:", err.message);
}
