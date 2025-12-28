import axios from "axios";

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
const CHAT_API_KEY = process.env.CHAT_SERVICE_API_KEY;

export const chatController = {
  sendMessage: async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.user?.id;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const messages = [
        {
          role: "system",
          content: "You are an agricultural assistant for farmers. Provide helpful, accurate information about farming techniques, crops, weather, and related topics."
        },
        {
          role: "user",
          content: message
        }
      ];

      const response = await axios.post(CHAT_SERVICE_URL, {
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          "Authorization": `Bearer ${CHAT_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      const botResponse = response.data.choices[0]?.message?.content || 
                         "I'm here to help with your farming questions!";

      // Here you would typically save to database
      // await saveChatHistory(userId, message, botResponse);

      res.json({
        message: botResponse
      });

    } catch (error) {
      console.error("Chat service error:", error);
      const errorMessage = error.response?.data?.error?.message || 
                         error.message || 
                         "Failed to process chat message";
      res.status(500).json({ 
        error: "Chat service error",
        details: errorMessage 
      });
    }
  },

  getHistory: async (req, res) => {
    try {
      const userId = req.user?.id;
      
      // Implement your database query here
      // const history = await getChatHistory(userId);
      
      // For now return empty array
      res.json([]);
      
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  }
};