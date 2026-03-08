import { User } from "../models/user.js";
import { presenceService } from "../services/presence.js";

export const getAllUsers = async (req, res) => {
  const { limit, offset } = req.query;
  const currentUserId = req.user ? String(req.user.id) : null;
  try {
    let users = await User.findAll(Number(limit) || 20, Number(offset) || 0);

    // Filter out the current user if authenticated
    if (currentUserId) {
      users = users.filter((u) => String(u.id) !== currentUserId);
    }

    res
      .status(200)
      .json({ message: "Users fetched successfully", users, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getOnlineUsers = async (req, res) => {
  const currentUserId = req.user ? String(req.user.id) : null;
  try {
    const onlineIds = presenceService.getOnlineUserIds();

    // Fetch full profiles for all online users
    const users = await Promise.all(
      onlineIds.map(async (id) => {
        if (id === currentUserId) return null;
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

    res.status(200).json({
      message: "Online users fetched",
      users: users.filter(Boolean),
      ok: true,
    });
  } catch (err) {
    console.error("Error fetching online users:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getLeaderboard = async (req, res) => {
  const userId = req.user ? String(req.user.id) : null;

  try {
    // Fetch top 100 for ranking
    const allUsers = await User.findAll(100, 0);

    const top3 = allUsers.slice(0, 3);

    let userRank = -1;
    let currentUserData = null;

    if (userId) {
      userRank = allUsers.findIndex((u) => String(u.id) === userId) + 1;
      if (userRank > 0) {
        currentUserData = allUsers[userRank - 1];
      } else {
        // If not in top 100, fetch specifically
        const u = await User.findById(userId);
        if (u) {
          currentUserData = {
            id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            xp: u.xp,
            total_games: u.total_games,
          };
          // Note: rank is unknown if not in top 100 in this simple implementation
        }
      }
    }

    const others = allUsers.slice(3);

    res.status(200).json({
      message: "Leaderboard fetched successfully",
      top3,
      currentUser: currentUserData
        ? { ...currentUserData, rank: userRank }
        : null,
      others,
      ok: true,
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getUserPublicProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found", ok: false });
    }
    // Return only public fields
    const publicProfile = {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      xp: user.xp,
      total_games: user.total_games,
      created_at: user.created_at,
    };
    res
      .status(200)
      .json({ message: "User profile fetched", user: publicProfile, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { username, avatarUrl, bio } = req.body;
  try {
    const updatedUser = await User.updateUserProfile(userId, {
      username,
      avatarUrl,
      bio,
    });
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const deleteMyAccount = async (req, res) => {
  const userId = req.user.id;
  try {
    await User.delete(userId);
    res.status(200).json({ message: "Account deleted successfully", ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
