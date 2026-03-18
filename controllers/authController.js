import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.js";
import { redis } from "../db/cache.js";
import { emailService } from "../services/emailService.js";

const jwt_secret = process.env.JWT_SECRET || "your_jwt_secret";

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const exists = await User.exists(username, email);
    if (exists) {
      return res.status(400).json({
        message: "User already exists",
        ok: false,
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password_hash,
    });

    const token = jwt.sign({ id: newUser.id }, jwt_secret, {
      expiresIn: "90d",
    });

    // Send Onboarding Email
    emailService.sendWelcomeEmail(email, username).catch(console.error);

    return res.status(201).json({
      message: `Welcome ${newUser.username}, registration successful`,
      token,
      user: newUser,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findByUsernameOrEmail(username);
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        ok: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
        ok: false,
      });
    }

    const token = jwt.sign({ id: user.id }, jwt_secret, { expiresIn: "90d" });

    return res.status(200).json({
      message: `Welcome ${user.username}`,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        ok: false,
      });
    }

    const { rank, total_wins } = await User.getRankAndWins(req.user.id);

    res.status(200).json({
      message: "User data",
      user: { ...user, rank, total_wins },
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        ok: false,
      });
    }

    res.status(200).json({
      message: "User data",
      user,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const checkUnique = async (req, res) => {
  const { identifier } = req.body;

  try {
    const exists = await User.checkUnique(identifier);
    res.status(200).json({
      message: exists ? "not unique" : "unique",
      exists,
      ok: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findByUsernameOrEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found", ok: false });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setEx(`otp:${email}`, 900, otp); // 15 minutes

    await emailService.sendOtpEmail(user.email, otp);

    res.status(200).json({ ok: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedOtp = await redis.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", ok: false });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await redis.setEx(`reset_token:${resetToken}`, 900, email); // 15 minutes
    await redis.del(`otp:${email}`);

    res.status(200).json({ ok: true, resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};

export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    const email = await redis.get(`reset_token:${resetToken}`);
    if (!email) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token", ok: false });
    }

    const user = await User.findByUsernameOrEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found", ok: false });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, password_hash);
    await redis.del(`reset_token:${resetToken}`);

    res
      .status(200)
      .json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", ok: false });
  }
};
