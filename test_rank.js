import { User } from "./models/user.js";

async function testRank() {
  try {
    const users = await User.findAll(1, 0);
    if (!users || users.length === 0) {
      console.log("No users found to test.");
      process.exit(0);
    }

    const testUserId = users[0].id;
    console.log(`Testing with user ID: ${testUserId}`);

    const result = await User.getRankAndWins(testUserId);
    console.log("Result:", result);
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

testRank();
