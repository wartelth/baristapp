import { Router, Request, Response } from "express";
import { clarifyPrompt } from "../services/clarifyService";
import L from "../utils/logger";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const reqId = (req as any).__reqId ?? "????";

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    L.warn("CLARIFY", `#${reqId} Rejected: empty prompt`);
    res.status(400).json({ success: false, error: "Prompt is required." });
    return;
  }

  L.log("CLARIFY", `#${reqId} Clarifying: "${prompt.trim().slice(0, 80)}..."`);

  try {
    const result = await clarifyPrompt(prompt.trim());
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    L.error("CLARIFY", `#${reqId} Exception — ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
