export interface DaytonaSandbox {
  id: string;
  previewUrl?: string;
}

interface DaytonaConfig {
  apiUrl: string;
  apiKey: string;
  project?: string;
}

function getConfig(): DaytonaConfig | null {
  const apiUrl = process.env.DAYTONA_API_URL;
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiUrl || !apiKey) return null;
  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    project: process.env.DAYTONA_PROJECT,
  };
}

async function request(path: string, init: RequestInit): Promise<any> {
  const config = getConfig();
  if (!config) throw new Error("Daytona is not configured");
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Daytona ${response.status}: ${body}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function isDaytonaConfigured(): boolean {
  return !!getConfig();
}

export async function createSandbox(name: string): Promise<DaytonaSandbox> {
  const body = await request("/sandboxes", {
    method: "POST",
    body: JSON.stringify({
      name,
      project: process.env.DAYTONA_PROJECT ?? undefined,
    }),
  });
  return {
    id: String(body.id ?? body.sandboxId ?? name),
    previewUrl: body.previewUrl ? String(body.previewUrl) : undefined,
  };
}

export async function writeSandboxFile(
  sandboxId: string,
  targetPath: string,
  content: string
): Promise<void> {
  await request(`/sandboxes/${encodeURIComponent(sandboxId)}/files`, {
    method: "POST",
    body: JSON.stringify({
      path: targetPath,
      content,
    }),
  });
}

export async function runSandboxCommand(
  sandboxId: string,
  command: string
): Promise<{ ok: boolean; output: string }> {
  const body = await request(`/sandboxes/${encodeURIComponent(sandboxId)}/exec`, {
    method: "POST",
    body: JSON.stringify({ command }),
  });
  return {
    ok: Boolean(body.ok ?? body.exitCode === 0),
    output: String(body.output ?? body.stdout ?? ""),
  };
}
