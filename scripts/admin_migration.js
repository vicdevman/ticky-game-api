import db from "../db/db.js";

async function runMigrations() {
  console.log("Starting Admin Module migrations...");
  try {
    // 1. Add role column to users
    await db`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `;
    console.log("✅ Column 'role' added to users table.");

    // 2. Create route_metrics table
    await db`
      CREATE TABLE IF NOT EXISTS route_metrics (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        method VARCHAR(10) NOT NULL,
        status INTEGER,
        duration_ms INTEGER,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("✅ Table 'route_metrics' created.");

    // 3. Create index on route_metrics for faster filtering
    await db`
      CREATE INDEX IF NOT EXISTS idx_route_metrics_created_at ON route_metrics(created_at);
    `;

    // 4. Promote specific email to admin
    const adminEmail = "hellovicdevman@gmail.com";
    await db`
      UPDATE users 
      SET role = 'admin' 
      WHERE LOWER(email) = LOWER(${adminEmail});
    `;
    console.log(`✅ User ${adminEmail} promoted to admin.`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigrations();
