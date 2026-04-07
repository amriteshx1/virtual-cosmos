import "./loadEnv.js";
import { PROXIMITY_RADIUS } from "@virtual-cosmos/shared";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import "./models/UserSession.js";
import { attachSocketHandlers } from "./socket/handlers.js";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    proximityRadius: PROXIMITY_RADIUS,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

attachSocketHandlers(io);

async function start() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("[mongo] connected");
    } catch (err) {
      console.warn("[mongo] connection failed — continuing without DB for local dev");
      console.warn(err);
    }
  } else {
    console.warn("[mongo] MONGODB_URI not set — skipping MongoDB");
  }

  httpServer.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT}`);
    console.log(`[server] Socket.IO CORS origin: ${CLIENT_ORIGIN}`);
  });
}

void start();
