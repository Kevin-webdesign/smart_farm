import { db } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOtp, sendOtpEmail } from "../utils/otp.js";
import { generateToken } from "../utils/jwt.js";

// ======================
// Admin creation
// ======================
export const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      ["kevinuzamurera@gmail.com"]
    );
    if (existingUsers.length > 0) {
      return console.log({ message: "Admin user already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("kwakevin", 12);

    // Insert new admin user
    const [insertResult] = await db.query(
      `INSERT INTO users 
        (username, email, password, phone, role, address_district, address_sector, address_cell, address_village)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        "Kevin Uzamurera",
        "kevinuzamurera@gmail.com",
        hashedPassword,
        "+250791813688",
        "admin",
        "Gasabo",
        "Kacyiru",
        "Bugira",
        "Kagira",
      ]
    );
    console.log({ message: "Admin User created successfully" });

  } catch (err) {
    console.error("Server error ".err  );
  }
};
createAdminUser();

// ======================
// Register user
// ======================

export const registerUser = async (req, res) => {
  const { username, email, password, phone, role, address } = req.body;

  try {
    if (!username || !email || !password)
      return res.status(400).json({ message: "Username, email, and password are required" });

    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length)
      return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await db.query(
      `INSERT INTO users
       (username, email, password, phone, role, address_district, address_sector, address_cell, address_village)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, username, email, role, status, phone`,
      [
        username,
        email,
        hashedPassword,
        phone || null,
        role || "client",
        address?.district || null,
        address?.sector || null,
        address?.cell || null,
        address?.village || null,
      ]
    );

    // Generate JWT
    const token = generateToken(newUser.rows[0].id);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: newUser.rows[0],
      token, // <-- send token to client
    });
  } catch (err) {
    console.error("Register user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Login
// ======================
export const login = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    if (!password) return res.status(400).json({ message: "Password required" });
    if (!email && !phone) return res.status(400).json({ message: "Email or phone required" });

    const query = email
      ? "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL"
      : "SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL";

    const [rows] = await db.execute(query, [email || phone]);
    const user = rows[0];

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Forgot Password
// ======================

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ message: "Email is required!" });

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    );
    const user = rows[0];

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, an OTP has been sent.",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(
      "UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?",
      [otp, otpExpires, user.id]
    );

    await sendOtpEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: "If the email exists, an OTP has been sent.",
      requiresOtp: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================
// Verify OTP
// ======================

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    );
    const user = rows[0];

    if (!user || user.otp !== otp || new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await db.execute(
      "UPDATE users SET otp = NULL, otp_expires = NULL WHERE id = ?",
      [user.id]
    );

    const resetToken = jwt.sign(
      { userId: user.id, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================
// Reset Password
// ======================

export const resetPassword = async (req, res) => {
  const { email, newPassword, resetToken } = req.body;

  try {
    if (!email || !newPassword)
      return res.status(400).json({ message: "Email and new password are required!" });

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(400).json({ message: "User not found." });

    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        if (decoded.userId !== user.id || decoded.purpose !== "password_reset") {
          return res.status(400).json({ message: "Invalid reset token." });
        }
      } catch {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// ======================
// Get Profile
// ======================
export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
      [req.user.id]
    );
    const user = rows[0];

    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({
      _id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      address: {
        district: user.address_district,
        sector: user.address_sector,
        cell: user.address_cell,
        village: user.address_village,
      },
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// ======================
// Update Profile
// ======================

export const updateProfile = async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;

    // Check if email is already in use
    if (email) {
      const [checkRows] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ? AND deleted_at IS NULL",
        [email, req.user.id]
      );
      if (checkRows.length)
        return res.status(400).json({ message: "Email already in use" });
    }

    // Update user profile
    const [updateRows] = await db.execute(
      `UPDATE users SET 
        username = ?, 
        email = ?, 
        phone = ?, 
        address_district = ?,
        address_sector = ?,
        address_cell = ?,
        address_village = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        username,
        email,
        phone,
        address?.district || null,
        address?.sector || null,
        address?.cell || null,
        address?.village || null,
        req.user.id,
      ]
    );

    // Fetch updated user
    const [userRows] = await db.execute(
      "SELECT id, username, email, role, phone, status, address_district, address_sector, address_cell, address_village, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    const updatedUser = userRows[0];
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: {
          district: updatedUser.address_district,
          sector: updatedUser.address_sector,
          cell: updatedUser.address_cell,
          village: updatedUser.address_village,
        },
        status: updatedUser.status,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================
// Logout
// ======================
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Not authenticated" });

    const token = authHeader.split(" ")[1];

    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ message: "Invalid token" });

    // Add token to blacklist
    await db.query(
      "INSERT INTO token_blacklist (token, expires_at) VALUES (?, FROM_UNIXTIME(?))",
      [token, decoded.exp]
    );

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};