import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import userRouter from "./routes/user.js";
import gameRouter from "./routes/game.js";
import dotenv from "dotenv";
import "./db/db.js"; // Initialize Neon DB
import "./db/cache.js"; // Initialize Redis
import { User } from "./models/user.js";
import { Chat } from "./models/chat.js";
import { Game } from "./models/game.js";
import { gameService } from "./services/game.js";
import { presenceService } from "./services/presence.js";
import { getSessionXP } from "./utils/calculateXP.js";

dotenv.config();

const app = express();
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: "*" },
});
const PORT = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/game", gameRouter);

let games = {}; // {gameid: {ouenirejd:'X', iyeg7iwdow:'O'}, gameid: {ouenirejd:'X', iyeg7iwdow:'O'}, board: Array(9).fill('')}
// onlineUsers and socketIdToUsers moved to presenceService

app.get("/", (req, res) => {
  res.status(200).json({ message: "welcome to ticky api" });
});

/// Game Logic
const checkWin = (board) => {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], draw: false };
    }
  }

  const isDraw = board.every((cell) => cell !== "");
  return { winner: null, draw: isDraw };
};

// Iniite Mode
const infiniteMode = (positions, board, index) => {
  let nextIndex = null;
  if (positions.length == 5) {
    nextIndex = positions.slice(0, 1).join();
  } else if (positions.length >= 6) {
    const removeIndex = positions.slice(0, 1).join();
    nextIndex = positions.slice(1, 2).join();
    positions.shift();
    positions.push(index);
    board[Number(removeIndex)] = "";

    return { positions, board, nextIndex };
  }
  positions.push(index);
  return { positions, board, nextIndex };
};

// const init = infiniteMode(
//   [1, 2, 3, 4, 5],
//   ["x", "o", "", "", "", "o", "", "x", "o"],
//   8,
// );
// console.log(init);

/////////////////////////////////////////////// Socket IO helpers
const handleProcessEndGame = async (gameId, penaltyData = null) => {
  const latestResult = await gameService.getGameDetails(gameId);
  const gameParticipants = await gameService.getGameParticipants(gameId);

  if (latestResult.exist && gameParticipants && gameParticipants.length > 0) {
    const game = latestResult.game;
    let userProgress = [];

    if (penaltyData && penaltyData.leaverId && gameParticipants.length >= 2) {
      const leaver = gameParticipants.find(
        (p) => p.userId === penaltyData.leaverId,
      );
      const winner = gameParticipants.find(
        (p) => p.userId !== penaltyData.leaverId,
      );

      userProgress = [
        {
          userId: penaltyData.leaverId,
          xp_gained: 0,
          is_winner: false,
          score: leaver.character === "X" ? game.xScore || 0 : game.oScore || 0,
          oppScore:
            leaver.character === "X" ? game.oScore || 0 : game.xScore || 0,
        },
        {
          userId: winner.userId,
          xp_gained: 20, // Automatic win reward
          is_winner: true,
          score: winner.character === "X" ? game.xScore || 0 : game.oScore || 0,
          oppScore:
            winner.character === "X" ? game.oScore || 0 : game.xScore || 0,
        },
      ];
    } else if (gameParticipants.length >= 2) {
      const participantOne = gameParticipants[0];
      const participantTwo = gameParticipants[1];

      const pl1 = {
        id: participantOne.userId,
        score:
          participantOne.character === "X"
            ? game.xScore || 0
            : game.oScore || 0,
      };

      const pl2 = {
        id: participantTwo.userId,
        score:
          participantTwo.character === "X"
            ? game.xScore || 0
            : game.oScore || 0,
      };

      userProgress = getSessionXP(pl1, pl2).map((u) => ({
        ...u,
        score: u.userId === pl1.id ? pl1.score : pl2.score,
        oppScore: u.userId === pl1.id ? pl2.score : pl1.score,
      }));
    }

    for (const user of userProgress) {
      await User.updateUserProgress(
        user.userId,
        user.xp_gained,
        game.gameCount,
      );

      console.log("game left or ended:----", userProgress);

      const playerSocket = presenceService.getSocketId(user.userId);
      if (playerSocket) {
        io.to(playerSocket).emit("gameEnded", {
          status: true,
          msg:
            penaltyData && user.userId === penaltyData.leaverId
              ? "Game Ended - Penalty applied!"
              : "Game Ended!",
          score: user.score,
          xp: user.xp_gained,
          isWinner: user.is_winner,
          totalMatchPlayed: game.gameCount,
        });
      }

      await Game.saveGameResult({
        userId: user.userId,
        opponentId:
          userProgress.find((u) => u.userId !== user.userId)?.userId || null,
        myScore: user.score,
        opponentScore: user.oppScore,
        winner: user.is_winner,
        type: game.type || "classic",
      });
    }

    console.log("Game ended and results saved:", gameId);
    await gameService.endGame(gameId);
    broadcastWaitingGames(); // Broadcast updated waiting games after a game ends
  } else {
    io.to(gameId).emit("gameEnded", {
      status: false,
      msg: "couldn't end game",
    });
  }
};

const broadcastOnlineUsers = async () => {
  try {
    const onlineIds = presenceService.getOnlineUserIds();
    const users = await Promise.all(
      onlineIds.map(async (id) => {
        const u = await User.findById(id);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          avatar_url: u.avatar_url,
          xp: u.xp,
          total_games: u.total_games,
        };
      }),
    );
    const allUsers = users.filter(Boolean);

    // Send each user a personalized list excluding themselves
    for (const userId of onlineIds) {
      const socketId = presenceService.getSocketId(userId);
      if (socketId) {
        io.to(socketId).emit("usersOnline", {
          users: allUsers.filter((u) => String(u.id) !== String(userId)),
          ok: true,
        });
      }
    }
  } catch (err) {
    console.error("Error broadcasting online users:", err);
  }
};

const broadcastWaitingGames = async () => {
  try {
    const games = await gameService.getWaitingGames();
    const enriched = await Promise.all(
      games.map(async (g) => {
        const profile = await User.findById(g.waitingPlayer.userId);
        return {
          gameId: g.id,
          type: g.type,
          time: g.time,
          waitingPlayer: {
            userId: g.waitingPlayer.userId,
            username: profile?.username || "Unknown",
            avatar_url: profile?.avatar_url,
            character: g.waitingPlayer.character,
            xp: profile?.xp || 0,
          },
        };
      }),
    );
    io.emit("waitingGames", {
      games: enriched,
      ok: true,
    });
  } catch (err) {
    console.error("Error broadcasting waiting games:", err);
  }
};

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  const disconnectTimers = {};
  const DISCONNECT_TIMEOUT = 60000; // 60 seconds

  /*
    USER REGISTRATION
    */
  socket.on("registerPlayer", ({ userId }) => {
    presenceService.addUser(userId, socket.id);
    console.log(
      "online user count:",
      presenceService.getOnlineUserIds().length,
    );
    broadcastOnlineUsers();
  });

  /*
    JOIN GAME
    */
  socket.on(
    "joinGame",
    async ({ gameId, userId, join, time = 2700, type = "classic" }) => {
      socket.join(gameId);
      socket.data.gameId = gameId;

      const existing = await gameService.getParticipant(userId);
      const initialGame = await gameService.getGameDetails(gameId);

      if (existing.exist) {
        await gameService.markConnected(userId);

        if (disconnectTimers[userId]) {
          clearTimeout(disconnectTimers[userId]);
          delete disconnectTimers[userId];
        }

        // Fetch rich participant data for reconnection
        const participantsRaw = await gameService.getGameParticipants(
          existing.participant.gameId,
        );
        const participantsWithProfiles = await Promise.all(
          participantsRaw.map(async (p) => {
            const profile = await User.findById(p.userId);
            return {
              ...p,
              username: profile?.username || "Unknown",
              avatar_url: profile?.avatar_url,
              xp: profile?.xp || 0,
              total_games: profile?.total_games || 0,
            };
          }),
        );

        socket.emit("playerAssigned", {
          character: existing.participant.character,
          currentPlayer: initialGame.game.currentPlayer,
          participants: participantsWithProfiles,
          type: initialGame.game.type,
        });

        io.to(existing.participant.gameId).emit("playerReconnected", {
          userId,
          participants: participantsWithProfiles,
          currentPlayer: initialGame.game.currentPlayer,
        });

        return;
      }

      const gameResult = await gameService.getGameDetails(gameId);

      if (join && !gameResult.exist) {
        socket.emit("joinMsg", { exist: false });
        return;
      }

      if (!gameResult.exist) {
        console.log("game created with type:", type);
        await gameService.createGame(gameId, type, time);
        broadcastWaitingGames();
      }

      const participants = await gameService.getGameParticipants(gameId);

      console.log("first version of participants:", participants);

      if (participants.length >= 2) {
        socket.emit("gameFull");
        return;
      }

      // Smart character assignment: pick the one not taken
      let character = "X";
      if (participants.length === 1) {
        console.log("first participant:", participants[0].character);
        character = participants[0].character === "X" ? "O" : "X";
        console.log("next participant character:", character);
      }

      await gameService.joinGame(gameId, userId, character);

      // Fetch rich participant data (including profiles from DB) after join
      const updatedRaw = await gameService.getGameParticipants(gameId);
      const updatedWithProfiles = await Promise.all(
        updatedRaw.map(async (p) => {
          const profile = await User.findById(p.userId);
          return {
            ...p,
            username: profile?.username || "Unknown",
            avatar_url: profile?.avatar_url,
            xp: profile?.xp || 0,
            total_games: profile?.total_games || 0,
          };
        }),
      );

      const getGameDetails = await gameService.getGameDetails(gameId);
      const gameParticipants = await gameService.getGameParticipants(gameId);

      socket.emit("playerAssigned", {
        character,
        currentPlayer: getGameDetails.game.currentPlayer,
        participants: updatedWithProfiles,
        type: getGameDetails.game.type,
      });

      console.log(getGameDetails);
      console.log("player connected:----", userId, character);
      console.log("found participants:---", gameParticipants);
      console.log(
        `current player ${userId}`,
        getGameDetails.game.currentPlayer,
      );

      io.to(gameId).emit("playersUpdated", {
        players: updatedWithProfiles,
        currentPlayer: getGameDetails.game.currentPlayer,
      });

      broadcastWaitingGames();
    },
  );

  /*
    PLAYER MOVE
    */
  socket.on("playerMove", async ({ gameId, boxIndex, player }) => {
    const gameResult = await gameService.getGameDetails(gameId);

    if (!gameResult.exist) return;

    const game = gameResult.game;

    if (!game.board) {
      game.board = Array(9).fill("");
      game.positions = [];
      game.nextIndex = null;
    }

    if (game.board[boxIndex] !== "") return;

    game.board[boxIndex] = player;

    if (game.type == "infinite") {
      console.log("beforeeee monitorinnggg inifite game:", {
        gamePosition: game.positions,
        gameBoard: game.board,
        boxIndex,
      });
      const result = infiniteMode(game.positions, game.board, boxIndex);
      game.board = result.board;
      game.positions = result.positions;
      game.nextIndex = result.nextIndex;

      console.log("monitorinnggg inifite game:", { result });
    }
    const { winner, draw } = checkWin(game.board);

    if (winner) {
      if (winner === "X") game.xScore = (game.xScore || 0) + 1;
      else game.oScore = (game.oScore || 0) + 1;
    }

    game.currentPlayer = player === "X" ? "O" : "X";

    console.log("board updated", game.currentPlayer);

    // Immediately broadcast the move result
    io.to(gameId).emit("boardUpdated", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      win: winner,
      draw: draw,
      xScore: game.xScore,
      oScore: game.oScore,
      type: game.type,
      nextIndex: game.nextIndex,
    });

    console.log("match count: ----", game.gameCount);

    if (winner || draw) {
      // Round is over. Reset board after a delay and alternate starter.
      const prevStarter = game.roundStartedBy || "X";
      const nextStarter = prevStarter === "X" ? "O" : "X";

      // Fetch latest game state in case of reconnections during delay
      const latestResult = await gameService.getGameDetails(gameId);
      if (!latestResult.exist) return;
      const updatedGame = latestResult.game;

      updatedGame.board = Array(9).fill("");
      updatedGame.currentPlayer = nextStarter;
      updatedGame.roundStartedBy = nextStarter;
      updatedGame.xScore = game.xScore;
      updatedGame.oScore = game.oScore;
      updatedGame.gameCount += 1;
      updatedGame.positions = [];
      updatedGame.nextIndex = null;

      await gameService.updateGameState(gameId, updatedGame);
    } else {
      await gameService.updateGameState(gameId, game);
    }
  });

  socket.on("nextRound", async ({ gameId }) => {
    const gameResult = await gameService.getGameDetails(gameId);

    if (!gameResult.exist) return;

    const game = gameResult.game;

    io.to(gameId).emit("boardUpdated", {
      board: game.board,
      currentPlayer: game.currentPlayer,
      win: null,
      draw: false,
      xScore: game.xScore,
      oScore: game.oScore,
      type: game.type,
      nextIndex: game.nextIndex,
    });
  });

  /*
    SEND MESSAGE
    */
  socket.on("sendMessage", async ({ message, gameId }) => {
    const { from, to } = message;

    try {
      await Chat.sendMessage({
        conversationId: gameId || message.conversationId,
        senderId: from,
        content: message.content,
      });
    } catch (err) {
      console.error("Error saving message to DB:", err);
    }

    let fromUser = null;
    try {
      fromUser = await User.findById(from);
    } catch (err) {
      console.error("Error fetching user info for message.from:", err);
    }

    const fromSocket = presenceService.getSocketId(from);
    const toSocket = presenceService.getSocketId(to);

    console.log({
      conversationId: gameId || message.conversationId,
      senderId: from,
      content: message.content,
      fromSocket,
      toSocket,
    });

    if (gameId) {
      fromSocket && io.to(fromSocket).emit("gameMessage", { message });
      toSocket && io.to(toSocket).emit("gameMessage", { message, fromUser });
    } else {
      // fromSocket && io.to(fromSocket).emit("newMessage", { message });
      toSocket && io.to(toSocket).emit("newMessage", { message, fromUser });
    }
  });

  /*
    PLAYER LEAVE
    */
  socket.on("leaveGame", async ({ userId }) => {
    const participant = await gameService.getParticipant(userId);

    if (!participant.exist) return;

    const gameId = participant.participant.gameId;
    const participants = await gameService.getGameParticipants(gameId);

    if (participants.length >= 2) {
      // If 2 players, apply penalty to leaver and reward opponent
      await handleProcessEndGame(gameId, { leaverId: userId });
    } else {
      // Just clean up if it's only one player
      await gameService.leaveGame(userId);
      socket.leave(gameId);
      io.to(gameId).emit("playerLeft", { userId });
      broadcastWaitingGames();

      const remaining = await gameService.getGameParticipants(gameId);
      if (remaining.length === 0) {
        await gameService.endGame(gameId);
      }
    }
  });

  /*
    END GAME
    */
  socket.on("endGame", async ({ gameId }) => {
    if (!gameId) {
      console.log("couldnt end game");
      return;
    }
    await handleProcessEndGame(gameId);
  });

  /*
    DISCONNECT
    */
  socket.on("disconnect", async () => {
    const userId = presenceService.removeBySocketId(socket.id);
    if (!userId) return;

    const participant = await gameService.markDisconnected(userId);
    if (!participant) return;

    const gameId = participant.gameId;

    io.to(gameId).emit("playerConnectionIssue", {
      userId,
      message: "Player reconnection...",
    });

    disconnectTimers[userId] = setTimeout(async () => {
      const latest = await gameService.getParticipant(userId);

      if (!latest.exist) return;

      if (latest.participant.connected) {
        return; // player already came back
      }

      const gameId = latest.participant.gameId;

      await handleProcessEndGame(gameId, { leaverId: userId });

      delete disconnectTimers[userId];
    }, DISCONNECT_TIMEOUT);

    broadcastOnlineUsers();
  });
});

server.listen(PORT, () => {
  console.log(`server started successfully! on ${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
