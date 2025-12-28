import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    userName: String,
    email: { 
      type: String, 
      unique: true,
      sparse: true
    },
    password: String,
    phone: { 
      type: String, 
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      default: "client",
    },
    address: {
      district: String,
      sector: String,
      cell: String,
      village: String,
    },
    status: {
      type: String,
      default: "active",
    },
    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

// ✅ Prevent model overwrite during hot reloads
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;