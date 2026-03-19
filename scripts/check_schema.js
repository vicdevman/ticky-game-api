import db from "../db/db.js";

async function checkSchema() {
  try {
    const columns = await db`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    console.log("Users Table Columns:");
    console.table(columns);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error checking schema:", err.message);
    process.exit(1);
  }
}

checkSchema();
