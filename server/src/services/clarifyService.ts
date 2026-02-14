import Anthropic from "@anthropic-ai/sdk";
import { CLARIFY_PROMPT } from "../prompts/clarifyPrompt";
import L, { fmtMs, fmtCost } from "../utils/logger";
import type { ClarificationQuestion } from "@swissknife/shared";

interface ClarifySuccess {
  success: true;
  questions: ClarificationQuestion[];
  summary: string;
}

interface ClarifyFailure {
  success: false;
  error: string;
}

type ClarifyResult = ClarifySuccess | ClarifyFailure;

/**
 * Sends user prompt to Claude (direct API, not agent SDK) to get
 * clarification questions before generating the full app spec.
 * Uses Haiku for speed — this should feel instant.
 */
export async function clarifyPrompt(
  userPrompt: string
): Promise<ClarifyResult> {
  const startTime = Date.now();

  L.log("CLARIFY", "Generating clarification questions...");
  L.detail("CLARIFY", "Model", "claude-haiku-4-5-20251001");

  try {
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: CLARIFY_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const elapsed = Date.now() - startTime;
    const usage = response.usage;
    const cost =
      (usage.input_tokens * 0.8 + usage.output_tokens * 4) / 1_000_000;

    L.success("CLARIFY", `Done in ${fmtMs(elapsed)} — ${fmtCost(cost)}`);

    // Extract text
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No text response from Claude" };
    }

    // Parse JSON
    let parsed: any;
    try {
      // Try to extract JSON from the response (in case of markdown wrapping)
      const raw = textBlock.text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: "No JSON found in response" };
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      L.error("CLARIFY", `JSON parse failed: ${textBlock.text.slice(0, 200)}`);
      return { success: false, error: "Failed to parse clarification response" };
    }

    // Validate structure
    if (!parsed.summary || !Array.isArray(parsed.questions)) {
      return { success: false, error: "Invalid clarification structure" };
    }

    const questions: ClarificationQuestion[] = parsed.questions.map(
      (q: any, i: number) => ({
        id: q.id ?? `q${i + 1}`,
        question: String(q.question ?? ""),
        type: ["single", "multiple", "freeform"].includes(q.type)
          ? q.type
          : "freeform",
        options: Array.isArray(q.options)
          ? q.options.map(String)
          : undefined,
      })
    );

    L.detail("CLARIFY", "Summary", `"${parsed.summary.slice(0, 100)}"`);
    L.detail("CLARIFY", "Questions", questions.length);

    return {
      success: true,
      summary: parsed.summary,
      questions,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    L.error("CLARIFY", `Exception after ${fmtMs(elapsed)} — ${message}`);
    return { success: false, error: `Clarification failed: ${message}` };
  }
}
