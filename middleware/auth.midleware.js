// middleware/verifyAuth.js
import jwt from "jsonwebtoken";
import userModel from "../models/auth.model.js";

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ message: "Not Authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId).select("-password");

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const protect = verifyToken;
export default verifyToken;
