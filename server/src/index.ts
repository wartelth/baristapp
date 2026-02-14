import "dotenv/config";
import express from "express";
import cors from "cors";
import generateRouter from "./routes/generate";
import { ensureTmpDir, listSessions } from "./services/sessionStore";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Ensure tmp/ directory exists for session storage
ensureTmpDir();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  console.log("[HEALTH] Health check hit");
  res.json({ status: "ok" });
});

// Mini-app generation
app.use("/api/generate", generateRouter);

// Debug: list saved generation sessions
app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.listen(PORT, () => {
  console.log(`[BOOT] SwissKnife server running on port ${PORT}`);
  console.log(`[BOOT] ANTHROPIC_API_KEY ${process.env.ANTHROPIC_API_KEY ? "is set" : "is MISSING"}`);
  console.log(`[BOOT] CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=${process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ?? "not set"}`);
  console.log(`[BOOT] DISABLE_AUTOUPDATER=${process.env.DISABLE_AUTOUPDATER ?? "not set"}`);
});
