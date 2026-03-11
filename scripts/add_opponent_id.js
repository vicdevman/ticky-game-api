import db from "../db/db.js";

async function addOpponentIdCol() {
  try {
    await db`ALTER TABLE game_history ADD COLUMN IF NOT EXISTS opponent_id INTEGER;`;
    console.log("Successfully added opponent_id column to game_history table.");
    process.exit(0);
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

addOpponentIdCol();
