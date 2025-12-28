import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    userName: String,
    email: { type: String, required: true, unique: true },
    password: String,
    phone: Number,
    role : {
      type: String,
      default : "admin",
    },
    address: {
      district: String,
      sector: String,
      cell: String,
      village: String,
    },
    Status : {
      type: String,
      default : "active",
    },
    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);


// Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
