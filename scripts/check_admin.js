import db from "../db/db.js";

async function checkAdmin() {
  const email = "hellovicdevman@gmail.com";
  try {
    const [user] = await db`
      SELECT email, role FROM users 
      WHERE LOWER(email) = LOWER(${email})
    `;
    console.log(`User ${email} status:`, user);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error checking admin:", err.message);
    process.exit(1);
  }
}

checkAdmin();
