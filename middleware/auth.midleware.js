import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    // 1️⃣ Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    // 3️⃣ Check blacklist
    const [blacklist] = await db.query(
      "SELECT id FROM token_blacklist WHERE token = ? LIMIT 1",
      [token]
    );

    if (blacklist.length > 0) {
      return res.status(401).json({ message: "Token invalidated" });
    }

    // 4️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * IMPORTANT:
     * Your token payload is generated like:
     * jwt.sign({ id: user.id }, ...)
     */
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // 5️⃣ Fetch user
    const [rows] = await db.query(
      "SELECT id, username, email, phone, role, status FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    // 6️⃣ Attach user to request
    req.user = rows[0];
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
