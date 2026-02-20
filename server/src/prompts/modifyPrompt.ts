/**
 * System prompt for modifying an existing SwissKnife micro-app.
 * Dynamically includes the current spec so the model has full context.
 */

import { buildMasterPrompt } from "./masterPrompt";

export function buildModifyPrompt(currentSpecJson: string): string {
  return `${buildMasterPrompt()}

═══════════════════════════════════════
MODIFICATION MODE
═══════════════════════════════════════

You are modifying an EXISTING SwissKnife micro-app. The current app spec is provided below.

RULES FOR MODIFICATION:
1. Apply the user's requested changes while preserving everything else.
2. Keep the same "appId" — do NOT change it.
3. Output the COMPLETE modified JSON spec (not a diff or partial update).
4. Preserve existing screens, components, state keys, and actions that the user did NOT ask to change.
5. If adding new components, give them unique IDs that don't clash with existing ones.
6. If the user asks to remove something, remove it cleanly (update related state keys and actions too).

CURRENT APP SPEC:
${currentSpecJson}

Now apply the user's modification request and output the complete updated JSON spec.`;
}
