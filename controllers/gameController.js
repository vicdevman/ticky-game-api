import { gameService } from "../services/game.js";
import { User } from "../models/user.js";
import { Game } from "../models/game.js";
import { io } from "../server.js";
import { presenceService } from "../services/presence.js";

export const getMyGameSession = async (req, res) => {
  const userId = String(req.user.id);

  try {
    // Check if the user is a participant in any active game
    const participantResult = await gameService.getParticipant(userId);

    if (!participantResult.exist) {
      return res.status(200).json({ exist: false, session: null, ok: true });
    }

    const { gameId, character } = participantResult.participant;

    // Get game state
    const gameResult = await gameService.getGameDetails(gameId);

    if (!gameResult.exist) {
      // Participant record exists but game is gone — stale, treat as no session
      return res.status(200).json({ exist: false, session: null, ok: true });
    }

    const game = gameResult.game;

    // Get all participants to find the opponent
    const participants = await gameService.getGameParticipants(gameId);
    const opponentParticipant = participants.find(
      (p) => String(p.userId) !== userId,
    );

    // Fetch opponent's public profile if they exist
    let opponent = null;
    if (opponentParticipant) {
      const opponentUser = await User.findById(opponentParticipant.userId);
      if (opponentUser) {
        opponent = {
          id: opponentUser.id,
          username: opponentUser.username,
          avatar_url: opponentUser.avatar_url || null,
          character: opponentParticipant.character,
        };
      }
    }

    return res.status(200).json({
      exist: true,
      session: {
        gameCode: gameId,
        currentPlayer: game.currentPlayer,
        board: game.board || Array(9).fill(""),
        character, // the requesting user's character (X or O)
        xScore: game.xScore ?? 0,
        oScore: game.oScore ?? 0,
        type: game.type,
        opponent, // null if waiting for someone to join
      },
      ok: true,
    });
  } catch (err) {
    console.error("Error fetching game session:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const leaveGame = async (req, res) => {
  const userId = req.user.id;
  try {
    const participantResult = await gameService.getParticipant(userId);
    if (!participantResult.exist) {
      return res
        .status(400)
        .json({ message: "User is not in a game", ok: false });
    }

    const gameId = participantResult.participant.gameId;
    await gameService.leaveGame(userId);

    // Notify other participants in the room
    io.to(gameId).emit("playerLeft", { userId });

    res.status(200).json({ message: "Left game successfully", ok: true });
  } catch (err) {
    console.error("Error leaving game:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const endSession = async (req, res) => {
  const userId = req.user.id;
  try {
    const participantResult = await gameService.getParticipant(userId);
    if (!participantResult.exist) {
      return res
        .status(400)
        .json({ message: "User is not in a game", ok: false });
    }

    const gameId = participantResult.participant.gameId;
    await gameService.endGame(gameId);

    // Notify all participants in the room
    io.to(gameId).emit("gameEnded");

    res
      .status(200)
      .json({ message: "Game session ended successfully", ok: true });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getGameHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const history = await Game.getUserHistory(userId);
    res.status(200).json({
      message: "Game history fetched",
      history,
      ok: true,
    });
  } catch (err) {
    console.error("Error fetching game history:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getWaitingGames = async (req, res) => {
  try {
    const games = await gameService.getWaitingGames();

    // Enrich with waiting player details
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

    res.status(200).json({
      message: "Waiting games fetched",
      games: enriched,
      ok: true,
    });
  } catch (err) {
    console.error("Error fetching waiting games:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
