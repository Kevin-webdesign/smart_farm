import userModel from "../models/auth.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateOtp, sendOtpEmail } from "../utils/otp.js";

// Create admin user on startup
const createAdminUser = async () => {
  try {
    const adminExists = await userModel.findOne({ email: 'kevinuzamurera@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('kwakevin', 12);
      const admin = new userModel({
        userName: 'Kevin Uzamurera',
        email: 'kevinuzamurera@gmail.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        phone: '+250791813688',
        address: 'Kigali, Rwanda'
      });
      await admin.save();
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

createAdminUser();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Common cookie settings for main + subdomains
const cookieOptions = {
  httpOnly: true,
  secure: false, // Only over HTTPS
  sameSite: "lax", // Required for cross-domain cookies
  // domain: ".agrinnosol.com", // Works on both main domain and subdomains
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const registerUser = async (req, res) => {
  const { userName, email, password, phone, address, role } = req.body;

  try {
    if (!userName || !email || !password || !address) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await userModel.create({
      userName,
      email,
      password: hashedPassword,
      phone, 
      address,
      role: role || "client",
    });

    const token = generateToken(newUser._id);
    res.cookie("session", token, cookieOptions);

    return res.status(201).json({ 
      success: true,
      message: "Your account was successfully created!",
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, phone, password } = req.body;
  console.log("Login attempt for:", req.body);

  try {
    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: "Password is required!" 
      });
    }

    // Check if either email or phone is provided
    if (!email && !phone) {
      return res.status(400).json({ 
        success: false,
        message: "Email or phone number is required!" 
      });
    }

    // Build query based on provided credentials
    let query = {};
    if (email) {
      query.email = email;
    } else if (phone) {
      query.phone = phone;
    }

    console.log("Searching for user with query:", query);

    // Find user by email or phone
    const user = await userModel.findOne(query);

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials!" 
      });
    }

    console.log("User found:", user.email);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials!" 
      });
    }

    const token = generateToken(user._id);
    res.cookie("session", token, cookieOptions);

    return res.status(200).json({ 
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone
      }
    });
  } catch (error) {
    console.log("Login error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error" 
    });
  }
};
// Password Reset - Request OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        success: true, 
        message: "If the email exists, an OTP has been sent." 
      });
    }

    // Generate OTP for password reset
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(user.email, otp);

    return res.status(200).json({ 
      success: true, 
      message: "If the email exists, an OTP has been sent.",
      requiresOtp: true 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Verify OTP for Password Reset
export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // OTP is valid, allow password reset
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate a temporary reset token (optional, for extra security)
    const resetToken = jwt.sign({ userId: user._id, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    return res.status(200).json({ 
      success: true,
      message: "OTP verified successfully.",
      resetToken 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { email, newPassword, resetToken } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required!" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    // Verify reset token if provided (optional extra security)
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        if (decoded.userId !== user._id.toString() || decoded.purpose !== 'password_reset') {
          return res.status(400).json({ message: "Invalid reset token." });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Password reset successfully." 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      address: req.user.address,
      phone: req.user.phone,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { userName, email, phone, address } = req.body;
    
    if (email) {
      const existingUser = await userModel.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      req.user.id,
      { userName, email, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        userName: updatedUser.userName,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("session", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".agrinnosol.com"
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};