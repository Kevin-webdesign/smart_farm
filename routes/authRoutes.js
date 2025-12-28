import express from "express";
import {
  getProfile,
  login,
  registerUser,
  updateProfile,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import {protect} from "../middleware/auth.midleware.js";

const route = express.Router();

route.post("/register", registerUser);
route.post("/login", login);
route.post("/logout", logout);
route.get("/profile", protect, getProfile);
route.put("/profile", protect, updateProfile);

// Password reset routes
route.post("/forgot-password", forgotPassword);
route.post("/verify-reset-otp", verifyResetOtp);
route.post("/reset-password", resetPassword);

export default route;