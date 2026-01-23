import axios from "axios";
import { db } from "../config/db.js";

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
const CHAT_API_KEY = process.env.CHAT_SERVICE_API_KEY;

function groupMessagesByDate(messages) {
  const groups = {};

  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();

    if (!groups[date]) {
      groups[date] = {
        id: date,
        title:
          msg.content.length <= 30
            ? msg.content
            : msg.content.substring(0, 30) + "...",
        created_at: msg.created_at,
        updated_at: msg.created_at,
        message_count: 0,
        messages: [],
      };
    }

    groups[date].messages.push(msg);
    groups[date].message_count++;

    if (new Date(msg.created_at) > new Date(groups[date].updated_at)) {
      groups[date].updated_at = msg.created_at;
    }
  });

  return Object.values(groups).sort(
    (a, b) => new Date(a.updated_at) - new Date(b.updated_at)
  );
}

export const chatController = {
  sendMessage: async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.user?.id;

      if (!message)
        return res.status(400).json({ error: "Message is required" });

      const messagesForService = [
        {
          role: "system",
          content:
            "You are an agricultural assistant for farmers. Provide helpful, accurate information about farming techniques, crops, weather, and related topics.",
        },
        { role: "user", content: message },
      ];

      const response = await axios.post(
        CHAT_SERVICE_URL,
        {
          model: "gpt-3.5-turbo",
          messages: messagesForService,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${CHAT_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const botResponse =
        response.data.choices[0]?.message?.content ||
        "I'm here to help with your farming questions!";

      await db.query(
        `INSERT INTO messages (user_id, sender, content, type) VALUES (?, 'user', ?, 'text')`,
        [userId, message]
      );

      await db.query(
        `INSERT INTO messages (user_id, sender, content, type) VALUES (?, 'bot', ?, 'text')`,
        [userId, botResponse]
      );

      const [newMessages] = await db.query(
        `SELECT id, sender, content, type, created_at
         FROM messages
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 2`,
        [userId]
      );

      const sessions = groupMessagesByDate(newMessages.reverse());

      res.json({
        success: true,
        message: botResponse,
        sessions,
      });
    } catch (error) {
      console.error("Chat service error:", error);
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to process chat message";
      res.status(500).json({ error: "Chat service error", details: errorMessage });
    }
  },

  getHistory: async (req, res) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit) || 20;
      const cursor = req.query.cursor || null; 
      const direction = req.query.direction || "older"; 

      let query = `SELECT id, sender, content, type, created_at
                   FROM messages
                   WHERE user_id = ?`;
      const params = [userId];

      if (cursor) {
        if (direction === "older") {
          query += " AND created_at < ?";
          params.push(cursor);
        } else {
          query += " AND created_at > ?";
          params.push(cursor);
        }
      }

      query += " ORDER BY created_at DESC LIMIT ?";
      params.push(limit);

      const [rows] = await db.query(query, params);

      const orderedRows = direction === "older" ? rows.reverse() : rows;

      const sessions = groupMessagesByDate(orderedRows);

      const nextCursor =
        rows.length > 0
          ? direction === "older"
            ? rows[rows.length - 1].created_at
            : rows[0].created_at
          : null;

      res.json({
        success: true,
        sessions,
        nextCursor,
      });
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  },
};
