import { redis } from "../db/cache.js";
import { setState, getState, clearState } from "../sessions/game.js";

export const gameService = {
  async createGame(
    gameId,
    type = "classic",
    time = 2700,
    currentPlayer = "X",
    xScore = 0,
    oScore = 0,
    isPublic = true,
  ) {
    const game = {
      id: gameId,
      type,
      currentPlayer,
      xScore,
      oScore,
      time,
      isPublic,
      roundStartedBy: currentPlayer,
      gameCount: 0,
      createdAt: Date.now(),
    };

    await setState(`game:${gameId}`, game, time);

    return game;
  },

  async getGameDetails(gameId) {
    const game = await getState(`game:${gameId}`);

    if (game) {
      return { exist: true, game };
    }

    return { exist: false };
  },

  async joinGame(gameId, userId, character) {
    const participant = {
      gameId,
      userId,
      character,
      joinedAt: Date.now(),
    };

    // store participant lookup
    await redis.set(`game:participant:${userId}`, JSON.stringify(participant));

    // add user to game participants set
    await redis.sAdd(`game:${gameId}:participants`, userId);

    return participant;
  },

  async getParticipant(userId) {
    const participant = await redis.get(`game:participant:${userId}`);

    if (participant) {
      return {
        exist: true,
        participant: JSON.parse(participant),
      };
    }

    return { exist: false };
  },

  async getGameParticipants(gameId) {
    const userIds = await redis.sMembers(`game:${gameId}:participants`);

    if (!userIds.length) {
      return [];
    }

    const participants = await Promise.all(
      userIds.map((id) => redis.get(`game:participant:${id}`)),
    );

    return participants.filter(Boolean).map((p) => JSON.parse(p));
  },

  async leaveGame(userId) {
    const participant = await redis.get(`game:participant:${userId}`);

    if (!participant) return;

    const parsed = JSON.parse(participant);

    await redis.sRem(`game:${parsed.gameId}:participants`, userId);

    await redis.del(`game:participant:${userId}`);
  },

  async endGame(gameId) {
    const users = await redis.sMembers(`game:${gameId}:participants`);

    for (const userId of users) {
      await redis.del(`game:participant:${userId}`);
    }

    await redis.del(`game:${gameId}:participants`);
    await redis.del(`game:${gameId}`);
  },

  async updateGameState(gameId, gameState) {
    await redis.set(`game:${gameId}`, JSON.stringify(gameState));
  },

  async markDisconnected(userId) {
    const participantRaw = await redis.get(`game:participant:${userId}`);
    if (!participantRaw) return null;

    const participant = JSON.parse(participantRaw);

    participant.connected = false;
    participant.disconnectedAt = Date.now();

    await redis.set(`game:participant:${userId}`, JSON.stringify(participant));

    return participant;
  },

  async markConnected(userId) {
    const participantRaw = await redis.get(`game:participant:${userId}`);
    if (!participantRaw) return null;

    const participant = JSON.parse(participantRaw);

    participant.connected = true;
    participant.disconnectedAt = null;

    await redis.set(`game:participant:${userId}`, JSON.stringify(participant));

    return participant;
  },
  async getWaitingGames() {
    const keys = await redis.keys("game:*:participants");
    const waitingGames = [];

    for (const key of keys) {
      const count = await redis.sCard(key);
      if (count === 1) {
        const gameId = key.split(":")[1];
        const result = await this.getGameDetails(gameId);
        if (result.exist) {
          // Filter out private games from public lobby
          if (result.game.isPublic === false) continue;

          const participants = await this.getGameParticipants(gameId);
          waitingGames.push({
            ...result.game,
            waitingPlayer: participants[0],
          });
        }
      }
    }

    return waitingGames;
  },
};
