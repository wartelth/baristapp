const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(how to|steps to|instructions).*?\b(make|build|create)\b.*?\b(bomb|explosive|weapon)\b/i,
    reason: "Unsafe request related to weapon construction.",
  },
  {
    pattern: /\b(credit card|ssn|social security|passwords?)\b.*?\b(steal|hack|phish)\b/i,
    reason: "Unsafe request related to fraud or credential theft.",
  },
  {
    pattern: /\b(child sexual|csam|sexual minor)\b/i,
    reason: "Request contains disallowed sexual content involving minors.",
  },
];

export function moderateUserText(input: string): { blocked: boolean; reason?: string } {
  const text = input.trim();
  if (!text) return { blocked: false };

  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(text)) {
      return { blocked: true, reason: item.reason };
    }
  }

  return { blocked: false };
}
