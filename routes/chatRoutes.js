import express from "express";
import { db } from "../config/db.js";
import { getBotReply } from "../services/openrouterService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, content } = req.body;

  if (!email || !content?.trim()) {
    return res.status(400).json({ error: "Email and message content are required." });
  }

  try {
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!userRows.length) return res.status(404).json({ error: "User not found." });

    const userId = userRows[0].id;

    const [userMsgResult] = await db.query(
      `INSERT INTO messages (user_id, sender, content, type, created_at, updated_at)
       VALUES (?, 'user', ?, 'text', NOW(), NOW())`,
      [userId, content.trim()]
    );

    const botReply = await getBotReply(content);
    const botType = botReply.startsWith("INFO:") ? "info" : "text";
    const botContent = botType === "info" ? botReply.replace("INFO:", "").trim() : botReply;

    const [botMsgResult] = await db.query(
      `INSERT INTO messages (user_id, sender, content, type, created_at, updated_at)
       VALUES (?, 'bot', ?, ?, NOW(), NOW())`,
      [userId, botContent, botType]
    );

    res.json({ success: true, message: botContent });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

router.get("/history", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {

    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!userRows.length) return res.status(404).json({ error: "User not found." });

    const userId = userRows[0].id;

    const [messages] = await db.query(
      `SELECT sender, content, created_at
       FROM messages WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const grouped = groupMessagesByDate(messages);

    res.json({ success: true, sessions: grouped });
  } catch (err) {
    console.error("Get history error:", err.message);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

function groupMessagesByDate(messages) {
  const groups = {};

  messages.forEach(msg => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = {
        id: date,
        title: getSessionTitle(msg.content),
        created_at: msg.created_at,
        updated_at: msg.created_at,
        message_count: 0,
        messages: []
      };
    }

    groups[date].messages.push(msg);
    groups[date].message_count++;
    if (new Date(msg.created_at) > new Date(groups[date].updated_at)) {
      groups[date].updated_at = msg.created_at;
    }
  });

  return Object.values(groups)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(group => ({
      ...group,
      title: group.title || `Chat from ${new Date(group.created_at).toLocaleDateString()}`
    }));
}

// Helper: Generate short session title
function getSessionTitle(content) {
  if (!content) return "";
  return content.length <= 30 ? content : content.substring(0, 30) + "...";
}

export default router;