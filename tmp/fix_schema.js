import db from "../db/db.js";

async function fixSchema() {
  try {
    console.log("Checking if is_read column exists in messages table...");

    // Attempt to add the column if it doesn't exist
    await db`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    `;

    console.log("✅ Column 'is_read' ensured in 'messages' table.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error applying schema fix:", err);
    process.exit(1);
  }
}

fixSchema();
