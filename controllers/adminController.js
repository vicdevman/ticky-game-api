import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Admin } from "../models/admin.js";
import { User } from "../models/user.js";
import { redis } from "../db/cache.js";
import { emailService } from "../services/emailService.js";
import { presenceService } from "../services/presence.js";
import crypto from "crypto";

const ADMIN_EMAIL = "hellovicdevman@gmail.com";
const ADMIN_PASS = "123456"; // Default password as per spec

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if it's the root admin email
    if (email !== ADMIN_EMAIL) {
      return res
        .status(403)
        .json({ message: "Invalid admin credentials", ok: false });
    }

    // 2. Find user
    const user = await User.findByUsernameOrEmail(email);
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Admin access not authorized", ok: false });
    }

    // 3. Verify password (default 123456 or updated hash)
    // Note: In a real scenario, we'd hash 123456 initially.
    // For this implementation, we check the DB hash.
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && password !== ADMIN_PASS) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", ok: false });
    }

    const token = jwt.sign(
      { id: user.id, role: "admin" },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getSystemDashboard = async (req, res) => {
  try {
    const stats = await Admin.getOverallStats();
    const traffic = await Admin.getTrafficMetrics(1); // Last 24h
    const aiStats = await Admin.getAiAnalytics();

    // Real-time counts
    const onlineUserIds = presenceService.getOnlineUserIds();
    const activeGames = await Admin.getActiveGamesData(redis);

    res.json({
      ok: true,
      stats: {
        ...stats,
        online_users_count: onlineUserIds.length,
        active_games_count: activeGames.length,
      },
      traffic,
      aiStats,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getActiveGames = async (req, res) => {
  try {
    const games = await Admin.getActiveGamesData(redis);
    res.json({ ok: true, games });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getOnlineUsers = async (req, res) => {
  try {
    const userIds = presenceService.getOnlineUserIds();
    const users = await Admin.getOnlineUsersDetailed(userIds);
    res.json({ ok: true, users });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const listUsers = async (req, res) => {
  const { difficulty, result, search, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const users = await Admin.getUsersWithFilters({
      difficulty,
      result,
      search,
      limit,
      offset,
    });

    console.log(users)
    res.json({ ok: true, users });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await User.delete(userId);
    res.json({ ok: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const adminForgotPassword = async (req, res) => {
  const { email } = req.body;
  if (email !== ADMIN_EMAIL) {
    return res
      .status(403)
      .json({ message: "Only root admin can use this", ok: false });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setEx(`admin:otp:${email}`, 900, otp); // 15 mins
    await emailService.sendOtpEmail(email, "Super Admin", otp);
    res.json({ ok: true, message: "Admin OTP sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const adminResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const storedOtp = await redis.get(`admin:otp:${email}`);
    if (storedOtp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", ok: false });
    }

    const user = await User.findByUsernameOrEmail(email);
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await User.updatePassword(user.id, hashed);
    await redis.del(`admin:otp:${email}`);

    res.json({ ok: true, message: "Admin password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", ok: false });
  }
};
