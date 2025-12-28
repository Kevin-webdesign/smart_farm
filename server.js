import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/authRoutes.js";
import cropRoutes from "./routes/cropRoutes.js";
import harvestRoutes from "./routes/harvestRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import farmTransactionRoutes from "./routes/farm.routes.js";
import inputsRoutes from "./routes/inputsRoutes.js";

// Load env
dotenv.config();

const app = express();

/* ======================
   CORS CONFIG
====================== */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8080",
  "http://localhost:8081",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(
          new Error(`CORS blocked for origin: ${origin}`),
          false
        );
      }
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  })
);

/* ======================
   BODY & COOKIES
====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ======================
   ROUTES
====================== */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

app.use("/api/crops", cropRoutes);
app.use("/api/harvest", harvestRoutes);
app.use("/api/inputs", inputsRoutes);
app.use("/api/transactions", farmTransactionRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

/* ======================
   STATIC FILES
====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`
  );
});
