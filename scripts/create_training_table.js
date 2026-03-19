import db from "../db/db.js";

async function createTable() {
  console.log("Creating training_history table...");
  try {
    await db`
      CREATE TABLE IF NOT EXISTS training_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        mode VARCHAR(20) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        result VARCHAR(20) NOT NULL,
        duration INTEGER NOT NULL,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("✅ Table training_history created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
    process.exit(1);
  }
}

createTable();
