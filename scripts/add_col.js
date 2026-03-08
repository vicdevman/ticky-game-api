import db from "../db/db.js";

async function addCol() {
  try {
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`;
    console.log("Successfully added xp_updated_at column to users table.");
    process.exit(0);
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

addCol();
