import { Request } from "express";

const HF_API_URL = "https://api-inference.huggingface.co/models";

interface HuggingFaceProcessing {
  type: "huggingface";
  model?: string;
  task?: string;
}

/**
 * Forward requests to HuggingFace Inference API.
 * Supports image-classification, text-classification, text-generation, etc.
 */
export async function handleHuggingFace(
  req: Request,
  processing: HuggingFaceProcessing
): Promise<unknown> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const model = processing.model ?? "google/vit-base-patch16-224";
  const task = processing.task ?? "image-classification";

  console.log(`[HF] Calling model=${model} task=${task}`);

  // Determine content type and body based on task
  let contentType: string;
  let body: Uint8Array | string;

  if (task.includes("image") || task.includes("classification")) {
    // Expect base64 image in request body
    const imageData = req.body?.image ?? req.body?.data;
    if (!imageData) {
      throw new Error("No image data provided (expected body.image as base64)");
    }
    contentType = "application/octet-stream";
    body = new Uint8Array(Buffer.from(imageData, "base64"));
  } else {
    // Text-based tasks
    contentType = "application/json";
    body = JSON.stringify({
      inputs: req.body?.inputs ?? req.body?.text ?? req.body?.data ?? "",
      parameters: req.body?.parameters,
    });
  }

  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": contentType,
    },
    body: body as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
