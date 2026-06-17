import axios, { AxiosError, AxiosRequestConfig } from "axios";

// ============================================================
// HTTP client — axios against the shared Edifice API, with the admin session
// carried in httpOnly cookies (edifice_admin_*). On a 401 for a protected
// route it transparently rotates via /admin/auth/refresh once, then retries.
// Concurrent 401s share a single refresh. Mirrors the investor app's client.
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // false = public/auth endpoint, don't refresh on 401
}

type ExtraConfig = { _auth?: boolean; _retry?: boolean };
type AppRequestConfig = AxiosRequestConfig & ExtraConfig;

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshing: Promise<unknown> | null = null;

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (AppRequestConfig & ExtraConfig) | undefined;
    const status = error.response?.status;
    const isAuthRoute = config?.url?.startsWith("/admin/auth/") ?? false;

    if (
      status === 401 &&
      config &&
      !config._retry &&
      config._auth !== false &&
      !isAuthRoute
    ) {
      config._retry = true;
      try {
        refreshing =
          refreshing ??
          http.post("/admin/auth/refresh").finally(() => {
            refreshing = null;
          });
        await refreshing;
        return http(config);
      } catch {
        /* refresh failed — fall through and reject */
      }
    }
    return Promise.reject(error);
  },
);

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    let message = error.message;
    if (Array.isArray(data?.message)) message = data.message[0] ?? message;
    else if (typeof data?.message === "string") message = data.message;
    return new ApiError(message, error.response?.status ?? 0);
  }
  return new ApiError("Request failed", 0);
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const config: AppRequestConfig = {
    url: path,
    method: options.method ?? "GET",
    data: options.body,
    _auth: options.auth,
  };
  try {
    const res = await http.request<T>(config);
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}
