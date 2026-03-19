import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided", ok: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
        ok: false,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", ok: false });
  }
};
