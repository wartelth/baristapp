import { Request } from "express";

interface ProxyProcessing {
  type: "proxy";
  targetUrl?: string;
}

// Allowed domains for outbound proxy requests
const ALLOWED_DOMAINS = [
  "api-inference.huggingface.co",
  "api.openweathermap.org",
  "jsonplaceholder.typicode.com",
  "pokeapi.co",
  "api.github.com",
];

/**
 * Forward requests to an external API (proxy).
 * Only allows requests to whitelisted domains.
 */
export async function handleProxy(
  req: Request,
  processing: ProxyProcessing
): Promise<unknown> {
  const targetUrl = processing.targetUrl ?? req.body?.url;
  if (!targetUrl) {
    throw new Error("No target URL configured for proxy endpoint");
  }

  // Interpolate {{key}} in URL with body values
  const interpolatedUrl = targetUrl.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) =>
    String(req.body?.[key] ?? "")
  );

  // Validate domain
  const url = new URL(interpolatedUrl);
  if (!ALLOWED_DOMAINS.includes(url.hostname)) {
    throw new Error(
      `Domain not allowed: ${url.hostname}. Allowed: ${ALLOWED_DOMAINS.join(", ")}`
    );
  }

  console.log(`[PROXY] Forwarding to ${interpolatedUrl}`);

  const method = req.method === "GET" ? "GET" : "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward specific headers if provided
  if (req.body?.headers && typeof req.body.headers === "object") {
    Object.assign(headers, req.body.headers);
  }

  const options: RequestInit = { method, headers };
  if (method !== "GET" && req.body?.data) {
    options.body = JSON.stringify(req.body.data);
  }

  const response = await fetch(interpolatedUrl, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Proxy target error (${response.status}): ${errorText}`);
  }

  return response.json();
}
