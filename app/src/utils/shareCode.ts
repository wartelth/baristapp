const SHARE_CODE_GROUP = 3;
const SHARE_CODE_GROUPS = 3;
const SHARE_CODE_TOTAL = SHARE_CODE_GROUP * SHARE_CODE_GROUPS;

export function sanitizeShareCode(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function formatShareCode(cleaned: string): string {
  const compact = sanitizeShareCode(cleaned).slice(0, SHARE_CODE_TOTAL);
  const groups: string[] = [];
  for (let i = 0; i < compact.length; i += SHARE_CODE_GROUP) {
    groups.push(compact.slice(i, i + SHARE_CODE_GROUP));
  }
  return groups.join("-");
}

export function normalizeShareCodeInput(raw: string): string {
  return formatShareCode(raw);
}

export function isCompleteShareCode(raw: string): boolean {
  return sanitizeShareCode(raw).length === SHARE_CODE_TOTAL;
}

export function extractShareCodeFromText(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  // Expected QR payload: baristapp://import?code=abc-def-ghi
  const codeMatch = text.match(/[?&]code=([a-z0-9-]+)/i);
  if (codeMatch?.[1]) {
    return formatShareCode(codeMatch[1]);
  }

  // Fallback for any text containing a share-like token.
  const tokenMatch = text.match(/([a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}|[a-z0-9]{9})/i);
  if (tokenMatch?.[1]) {
    return formatShareCode(tokenMatch[1]);
  }

  return "";
}

