import type { GenerateResult, ClarifyResult, ModifyResult, MiniApp } from "@baristapp/shared";
import { config } from "../config";
import { getAuthHeaders } from "./supabaseClient";

const BASE_URL = config.apiBaseUrl;

/** Step 1: Get clarification questions for a prompt */
export async function clarifyPrompt(prompt: string): Promise<ClarifyResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/clarify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data as ClarifyResult;
}

/** Step 2: Generate the mini-app with optional clarification answers */
export async function generateMiniApp(
  prompt: string,
  clarifications?: { questionId: string; answer: string }[],
  additionalContext?: string
): Promise<GenerateResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, clarifications, additionalContext }),
  });

  const data = await response.json();
  return data as GenerateResult;
}

/** Modify an existing mini-app with a modification prompt */
export async function modifyMiniApp(
  currentSpec: MiniApp,
  modifyPrompt: string
): Promise<ModifyResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/modify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ currentSpec, modifyPrompt }),
  });

  const data = await response.json();
  return data as ModifyResult;
}

/** Call a per-app server endpoint (ML inference, transforms, proxies) */
export async function callServerEndpoint(
  appId: string,
  endpointId: string,
  data?: unknown
): Promise<unknown> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${BASE_URL}/api/apps/${appId}/endpoints/${endpointId}`,
    {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    }
  );

  return response.json();
}

/** Report a mini-app as inappropriate/offensive for review. */
export async function reportMiniApp(
  appId: string,
  reason: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/reports`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ appId, reason }),
  });
  return response.json() as Promise<{ success: boolean; id?: string; error?: string }>;
}

/** Delete all cloud data for the current user/device. */
export async function deleteMyCloudData(): Promise<{ success: boolean; deletedApps?: number; deletedStates?: number; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/storage/me`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{ success: boolean; deletedApps?: number; deletedStates?: number; error?: string }>;
}

export async function saveMySocialProfile(
  displayName: string,
  avatarIndex: number
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/social/profile`, {
    method: "PUT",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ displayName, avatarIndex }),
  });
  return response.json() as Promise<{ success: boolean; error?: string }>;
}

export async function getMySocialProfile(): Promise<{
  success: boolean;
  profile?: { displayName: string; avatarIndex: number };
  billing?: {
    planKey: "free" | "pro";
    plan: {
      key: "free" | "pro";
      label: string;
      monthlyPriceUsd: number;
      appLimitPerPeriod: number;
      periodDays: number;
      libraryAccess: boolean;
    };
    usage: {
      generatedInCurrentPeriod: number;
      remainingInCurrentPeriod: number;
      periodDays: number;
      periodStartedAt: string;
      periodEndsAt: string;
    };
    costs: {
      totalModelCostUsd: number;
      totalGenerations: number;
      totalModifications: number;
    };
    libraryAccess: boolean;
  };
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/social/profile`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    profile?: { displayName: string; avatarIndex: number };
    billing?: {
      planKey: "free" | "pro";
      plan: {
        key: "free" | "pro";
        label: string;
        monthlyPriceUsd: number;
        appLimitPerPeriod: number;
        periodDays: number;
        libraryAccess: boolean;
      };
      usage: {
        generatedInCurrentPeriod: number;
        remainingInCurrentPeriod: number;
        periodDays: number;
        periodStartedAt: string;
        periodEndsAt: string;
      };
      costs: {
        totalModelCostUsd: number;
        totalGenerations: number;
        totalModifications: number;
      };
      libraryAccess: boolean;
    };
    error?: string;
  }>;
}

export async function syncRevenueCatBilling(): Promise<{
  success: boolean;
  billing?: {
    planKey: "free" | "pro";
    plan: {
      key: "free" | "pro";
      label: string;
      monthlyPriceUsd: number;
      appLimitPerPeriod: number;
      periodDays: number;
      libraryAccess: boolean;
    };
    usage: {
      generatedInCurrentPeriod: number;
      remainingInCurrentPeriod: number;
      periodDays: number;
      periodStartedAt: string;
      periodEndsAt: string;
    };
    costs: {
      totalModelCostUsd: number;
      totalGenerations: number;
      totalModifications: number;
    };
    libraryAccess: boolean;
  };
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/billing/revenuecat/sync`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    billing?: {
      planKey: "free" | "pro";
      plan: {
        key: "free" | "pro";
        label: string;
        monthlyPriceUsd: number;
        appLimitPerPeriod: number;
        periodDays: number;
        libraryAccess: boolean;
      };
      usage: {
        generatedInCurrentPeriod: number;
        remainingInCurrentPeriod: number;
        periodDays: number;
        periodStartedAt: string;
        periodEndsAt: string;
      };
      costs: {
        totalModelCostUsd: number;
        totalGenerations: number;
        totalModifications: number;
      };
      libraryAccess: boolean;
    };
    error?: string;
  }>;
}

export async function createShareCode(
  appId: string
): Promise<{ success: boolean; shareCode?: string; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/social/share/${appId}`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{ success: boolean; shareCode?: string; error?: string }>;
}

export async function importSharedAppByCode(
  shareCode: string
): Promise<{
  success: boolean;
  app?: MiniApp;
  owner?: { userId: string; displayName: string; avatarIndex: number };
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/social/import/${encodeURIComponent(shareCode)}`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    app?: MiniApp;
    owner?: { userId: string; displayName: string; avatarIndex: number };
    error?: string;
  }>;
}

export async function listInstalledSharedApps(): Promise<{
  success: boolean;
  installed?: Array<{
    installedAppId: string;
    ownerUserId: string;
    ownerDisplayName: string;
    ownerAvatarIndex: number;
  }>;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/social/installed`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    installed?: Array<{
      installedAppId: string;
      ownerUserId: string;
      ownerDisplayName: string;
      ownerAvatarIndex: number;
    }>;
    error?: string;
  }>;
}

export async function listSharedWithMe(): Promise<{
  success: boolean;
  items?: Array<{
    installedAppId: string;
    title: string;
    icon: string;
    ownerUserId: string;
    ownerDisplayName: string;
    ownerAvatarIndex: number;
  }>;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/social/shared-with-me`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    items?: Array<{
      installedAppId: string;
      title: string;
      icon: string;
      ownerUserId: string;
      ownerDisplayName: string;
      ownerAvatarIndex: number;
    }>;
    error?: string;
  }>;
}

export async function listMyBadges(): Promise<{
  success: boolean;
  badges?: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>;
  progress?: {
    appsCreated: number;
    appsShared: number;
    appsImported: number;
    profileCustomized: boolean;
  };
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/social/badges`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    badges?: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
    }>;
    progress?: {
      appsCreated: number;
      appsShared: number;
      appsImported: number;
      profileCustomized: boolean;
    };
    error?: string;
  }>;
}

export async function listFeaturedLibraryApps(): Promise<{
  success: boolean;
  items?: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
    spec: MiniApp;
    status: "new" | "added" | "ignored";
    installedAppId?: string;
  }>;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/library/featured`, {
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    items?: Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      icon: string;
      spec: MiniApp;
      status: "new" | "added" | "ignored";
      installedAppId?: string;
    }>;
    error?: string;
  }>;
}

export async function addFeaturedLibraryApp(
  featuredAppId: string
): Promise<{
  success: boolean;
  installedAppId?: string;
  spec?: MiniApp;
  error?: string;
}> {
  const response = await fetch(`${BASE_URL}/api/library/featured/${featuredAppId}/add`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{
    success: boolean;
    installedAppId?: string;
    spec?: MiniApp;
    error?: string;
  }>;
}

export async function ignoreFeaturedLibraryApp(
  featuredAppId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${BASE_URL}/api/library/featured/${featuredAppId}/ignore`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return response.json() as Promise<{ success: boolean; error?: string }>;
}
