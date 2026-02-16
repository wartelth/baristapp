import "dotenv/config";
import express from "express";
import cors from "cors";
import clarifyRouter from "./routes/clarify";
import generateRouter from "./routes/generate";
import modifyRouter from "./routes/modify";
import appsRouter from "./routes/apps";
import storageRouter from "./routes/storage";
import reportsRouter from "./routes/reports";
import socialRouter from "./routes/social";
import libraryRouter from "./routes/library";
import billingRouter from "./routes/billing";
import { ensureTmpDir, listSessions } from "./services/sessionStore";
import { ensureReportsDir } from "./services/reportStore";
import L, { fmtMs, fmtStatus, fmtBytes, nextReqId } from "./utils/logger";

const app = express();
const PORT = process.env.PORT ?? 3001;

ensureTmpDir();
ensureReportsDir();

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

// User content reports
app.use("/api/reports", reportsRouter);

// Social: profile + sharing
app.use("/api/social", socialRouter);

// Developer library templates
app.use("/api/library", libraryRouter);

// Billing + subscriptions (RevenueCat sync + webhooks)
app.use("/api/billing", billingRouter);

// Debug: list saved generation sessions
app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.listen(PORT, () => {
  const supabaseServerKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  L.banner("SwissKnife Server v2");
  L.detail("BOOT", "Port", PORT as number);
  L.detail("BOOT", "ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY ? "set" : "MISSING ⚠");
  L.detail("BOOT", "SUPABASE_URL", process.env.SUPABASE_URL ? "set" : "not set");
  L.detail(
    "BOOT",
    "SUPABASE_SERVER_KEY",
    supabaseServerKey
      ? supabaseServerKey.startsWith("sb_secret_")
        ? "set (secret)"
        : "set (legacy)"
      : "not set"
  );
  L.detail("BOOT", "REVENUECAT_SECRET_API_KEY", process.env.REVENUECAT_SECRET_API_KEY ? "set" : "not set");
  L.detail("BOOT", "REVENUECAT_WEBHOOK_AUTH", process.env.REVENUECAT_WEBHOOK_AUTH ? "set" : "not set");
  L.separator();
});
