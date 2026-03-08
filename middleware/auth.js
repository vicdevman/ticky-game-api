import jwt from "jsonwebtoken";

const jwt_secret = process.env.JWT_SECRET || "your_jwt_secret";

export const auth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Support "Bearer TOKEN"

  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied", ok: false });
  }

  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid", ok: false });
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    next();
  } catch (err) {
    // If token is invalid, we still proceed but without req.user
    next();
  }
};
