import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Not authenticated" });

    const token = authHeader.split(" ")[1];

    const [blacklist] = await db.query("SELECT id FROM token_blacklist WHERE token = ? LIMIT 1", [token]);
    if (blacklist.length) return res.status(401).json({ message: "Token invalidated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      "SELECT id, username, email, phone, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [decoded.userId]
    );

    if (!rows.length) return res.status(401).json({ message: "User not found" });

    req.user = rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};