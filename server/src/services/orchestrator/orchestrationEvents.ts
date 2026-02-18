import L from "../../utils/logger";

export type OrchestrationStage =
  | "start"
  | "generation"
  | "validation"
  | "versioning"
  | "deploy"
  | "done"
  | "error";

export interface OrchestrationEvent {
  appId: string;
  userId: string;
  stage: OrchestrationStage;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const inMemoryEvents = new Map<string, OrchestrationEvent[]>();

export function emitOrchestrationEvent(event: Omit<OrchestrationEvent, "createdAt">): void {
  const fullEvent: OrchestrationEvent = {
    ...event,
    createdAt: new Date().toISOString(),
  };

  const key = `${event.userId}:${event.appId}`;
  const current = inMemoryEvents.get(key) ?? [];
  current.push(fullEvent);
  if (current.length > 100) {
    current.shift();
  }
  inMemoryEvents.set(key, current);

  L.log("AGENT", `[event:${event.stage}] ${event.appId} — ${event.message}`);
}

export function getOrchestrationEvents(userId: string, appId: string): OrchestrationEvent[] {
  return inMemoryEvents.get(`${userId}:${appId}`) ?? [];
}
