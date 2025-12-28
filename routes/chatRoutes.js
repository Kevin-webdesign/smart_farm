import express from "express";
import Message from "../models/Message.js";
import User from "../models/auth.model.js";
import { getBotReply } from "../services/openrouterService.js";

const router = express.Router();

// Send message
router.post("/", async (req, res) => {
  const { email, content } = req.body;

  if (!email || !content?.trim()) {
    return res.status(400).json({ error: "Email and message content are required." });
  }

  try {
    // 🔍 Check user
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // 💬 Save user message
    const userMessage = new Message({
      user: user._id,
      sender: "user",
      content: content.trim(),
    });
    await userMessage.save();

    // 🤖 Get bot reply
    const botReply = await getBotReply(content);

    // 💬 Save bot message
    const botMessage = new Message({
      user: user._id,
      sender: "bot",
      content: botReply,
    });
    await botMessage.save();

    res.json({ 
      success: true,
      message: botReply 
    });
  } catch (err) {
    console.error("❌ Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

// Get chat history for a user
router.get("/history", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Get all messages for the user, grouped by date or session
    const messages = await Message.find({ user: user._id })
      .sort({ createdAt: -1 })
      .select('sender content createdAt')
      .lean();
    const groupedMessages = groupMessagesByDate(messages);
    
    res.json({
      success: true,
      sessions: groupedMessages
    });
  } catch (err) {
    console.error("❌ Get history error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

// Helper function to group messages by date
function groupMessagesByDate(messages) {
  const groups = {};
  
  messages.forEach(message => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = {
        id: date,
        title: getSessionTitle(message.content),
        created_at: message.createdAt,
        updated_at: message.createdAt,
        message_count: 0,
        messages: []
      };
    }
    groups[date].messages.push(message);
    groups[date].message_count++;
    // Update updated_at to the latest message
    if (new Date(message.createdAt) > new Date(groups[date].updated_at)) {
      groups[date].updated_at = message.createdAt;
    }
  });

  // Convert to array and sort by updated_at
  return Object.values(groups)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(group => ({
      ...group,
      title: group.title || `Chat from ${new Date(group.created_at).toLocaleDateString()}`
    }));
}

// Helper function to create session title from first message
function getSessionTitle(content) {
  if (content.length <= 30) return content;
  return content.substring(0, 30) + '...';
}

export default router;