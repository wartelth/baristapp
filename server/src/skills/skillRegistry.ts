import fs from "fs";
import path from "path";
import type { SkillDefinition } from "./types";

const skills = new Map<string, SkillDefinition>();

const CATALOG_DIR = path.join(__dirname, "catalog");

function loadCatalog(): void {
  if (!fs.existsSync(CATALOG_DIR)) {
    console.warn("[SKILLS] Catalog directory not found:", CATALOG_DIR);
    return;
  }

  const files = fs.readdirSync(CATALOG_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(CATALOG_DIR, file), "utf-8");
      const def: SkillDefinition = JSON.parse(raw);

      if (!def.id || !def.name || !def.provider || !def.actions) {
        console.warn(`[SKILLS] Skipping invalid skill file: ${file}`);
        continue;
      }

      skills.set(def.id, def);
    } catch (err) {
      console.error(`[SKILLS] Failed to load ${file}:`, err);
    }
  }

  console.log(`[SKILLS] Loaded ${skills.size} skills from catalog`);
}

export function getSkill(id: string): SkillDefinition | undefined {
  return skills.get(id);
}

export function getAllSkills(): SkillDefinition[] {
  return Array.from(skills.values());
}

export function getSkillIds(): string[] {
  return Array.from(skills.keys());
}

export function hasSkill(id: string): boolean {
  return skills.has(id);
}

/**
 * Build a compact summary of all skills for LLM prompt injection.
 * Includes skill id, description, and action signatures.
 */
export function buildSkillPromptSummary(): string {
  const lines: string[] = [];

  for (const skill of skills.values()) {
    const actionSummaries = Object.entries(skill.actions).map(([actionId, action]) => {
      const paramList = Object.entries(action.params)
        .map(([name, p]) => `${name}${p.required ? "" : "?"}:${p.type}`)
        .join(", ");
      return `${actionId}(${paramList})`;
    });

    lines.push(`- ${skill.id}: ${skill.description}. Actions: ${actionSummaries.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Build a list of skill metadata for the client (no provider secrets).
 */
export function getSkillManifest(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
}> {
  return getAllSkills().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
  }));
}

loadCatalog();
