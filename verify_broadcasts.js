import { io } from "socket.io-client";

// Simulation script to verify broadcasts
// NOTE: This assumes the server is running on http://localhost:3000

const SOCKET_URL = "http://localhost:3000";

const createClient = (name) => {
  const socket = io(SOCKET_URL);

  socket.on("connect", () => {
    console.log(`[${name}] Connected to server`);
  });

  socket.on("usersOnline", (data) => {
    console.log(
      `[${name}] Received usersOnline:`,
      JSON.stringify(data, null, 2),
    );
  });

  socket.on("waitingGames", (data) => {
    console.log(
      `[${name}] Received waitingGames:`,
      JSON.stringify(data, null, 2),
    );
  });

  socket.on("disconnect", () => {
    console.log(`[${name}] Disconnected`);
  });

  return socket;
};

console.log("Starting verification simulation...");

const client1 = createClient("Client 1");
const client2 = createClient("Client 2");

setTimeout(() => {
  console.log("\n--- Registering Player 1 ---");
  client1.emit("registerPlayer", { userId: "1" });
}, 2000);

setTimeout(() => {
  console.log("\n--- Player 1 creating game ---");
  client1.emit("joinGame", {
    gameId: "test-game-123",
    userId: "1",
    join: false,
  });
}, 4000);

setTimeout(() => {
  console.log("\n--- Registering Player 2 ---");
  client2.emit("registerPlayer", { userId: "2" });
}, 6000);

setTimeout(() => {
  console.log("\n--- Player 2 joining game ---");
  client2.emit("joinGame", {
    gameId: "test-game-123",
    userId: "2",
    join: true,
  });
}, 8000);

setTimeout(() => {
  console.log("\n--- Disconnecting Client 1 ---");
  client1.disconnect();
}, 10000);

setTimeout(() => {
  console.log(
    "\nSummary: Check logs above for 'usersOnline' and 'waitingGames' events.",
  );
  console.log("Verification script will exit in 5 seconds...");
}, 12000);

setTimeout(() => {
  process.exit(0);
}, 17000);
