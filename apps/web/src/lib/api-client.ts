import type { ApiResponse } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;

        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!json.success) return false;

        useAuthStore.getState().setAccessToken(json.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRefresh, headers, ...rest } = options;

  const doFetch = () => {
    const s = useAuthStore.getState();

    return fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(s.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {}),
        ...(s.currentTeamId ? { "X-Team-Id": String(s.currentTeamId) } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRefresh) {
    const ok = await attemptRefresh();
    if (ok) {
      res = await doFetch();
    } else {
      useAuthStore.getState().clearAuth();
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(res.status, json.error.code, json.error.message, json.error.details);
  }

  return json.data;
}
