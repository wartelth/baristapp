import jwt from "jsonwebtoken";
import type { Request } from "express";

/**
 * Extracts user ID from request.
 * Prefers Supabase JWT (Authorization: Bearer) when present and valid.
 * Falls back to x-user-id (from client) or x-device-id.
 */
export function getUserId(req: Request): string {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret) as { sub?: string };
        if (decoded?.sub) return decoded.sub;
      } catch {
        // Token invalid or expired — fall through to device-id
      }
    }
  }

  return (req.headers["x-user-id"] as string) ?? (req.headers["x-device-id"] as string) ?? "anonymous";
}
