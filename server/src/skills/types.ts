export interface SkillParamDef {
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillActionDef {
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  params: Record<string, SkillParamDef>;
  transform?: string;
  cacheTtlMs?: number;
}

export type SkillCategory =
  | "weather"
  | "finance"
  | "sports"
  | "news"
  | "utilities"
  | "social"
  | "entertainment";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;

  capability: "network";
  rateLimit: { requests: number; windowMs: number };

  provider: {
    baseUrl: string;
    authType: "apiKey" | "bearer" | "none";
    authEnvVar?: string;
    authHeader?: string;
    headers?: Record<string, string>;
  };

  actions: Record<string, SkillActionDef>;
}

export interface SkillInvokeRequest {
  skillId: string;
  actionId: string;
  params?: Record<string, unknown>;
  appId: string;
  declaredSkills: string[];
}

export interface SkillInvokeResult {
  success: true;
  data: unknown;
  cached: boolean;
}

export interface SkillInvokeError {
  success: false;
  error: string;
  code: "UNKNOWN_SKILL" | "UNKNOWN_ACTION" | "UNDECLARED_SKILL" | "PARAM_ERROR" | "RATE_LIMITED" | "AUTH_MISSING" | "FETCH_ERROR" | "TRANSFORM_ERROR";
}

export type SkillInvokeResponse = SkillInvokeResult | SkillInvokeError;
