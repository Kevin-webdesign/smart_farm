// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: String, enum: ["user", "bot"], required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "info"], default: "text" },
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;
