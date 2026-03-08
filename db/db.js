// src/config/db.js
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const pool = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    timeout: 10000, // 10 second timeout to prevent hanging connections
  },
});

// Test connection
(async () => {
  try {
    const result = await pool`SELECT NOW()`;
    console.log("✅ Neon DB connected successfully at:", result[0].now);
  } catch (err) {
    console.error("❌ Neon DB connection error:", err.message);
  }
})();

export default pool;
