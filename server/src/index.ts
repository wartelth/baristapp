import "dotenv/config";
import express from "express";
import cors from "cors";
import clarifyRouter from "./routes/clarify";
import generateRouter from "./routes/generate";
import modifyRouter from "./routes/modify";
import appsRouter from "./routes/apps";
import storageRouter from "./routes/storage";
import { ensureTmpDir, listSessions } from "./services/sessionStore";
import L, { fmtMs, fmtStatus, fmtBytes, nextReqId } from "./utils/logger";

const app = express();
const PORT = process.env.PORT ?? 3001;

ensureTmpDir();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Request / Response logging middleware
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const id = nextReqId();
  const start = Date.now();
  (req as any).__reqId = id;

  L.log("REQ", `#${id} ${req.method} ${req.path} ← ${req.ip ?? "unknown"}`);

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const elapsed = Date.now() - start;
    const size = JSON.stringify(body)?.length ?? 0;
    L.log("RES", `#${id} ${fmtStatus(res.statusCode)} ${req.method} ${req.path} → ${fmtBytes(size)} ${fmtMs(elapsed)}`);
    return originalJson(body);
  };

  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Clarification step (pre-generation)
app.use("/api/clarify", clarifyRouter);

// Mini-app generation
app.use("/api/generate", generateRouter);

// Mini-app modification
app.use("/api/modify", modifyRouter);

// Per-app server endpoints (ML inference, transforms, proxies)
app.use("/api/apps", appsRouter);

// Cloud storage (Supabase-backed)
app.use("/api/storage", storageRouter);

// Debug: list saved generation sessions
app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.listen(PORT, () => {
  L.banner("SwissKnife Server v2");
  L.detail("BOOT", "Port", PORT as number);
  L.detail("BOOT", "ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY ? "set" : "MISSING ⚠");
  L.detail("BOOT", "SUPABASE_URL", process.env.SUPABASE_URL ? "set" : "not set");
  L.detail("BOOT", "SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "not set");
  L.separator();
});
