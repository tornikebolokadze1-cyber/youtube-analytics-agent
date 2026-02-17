import { config } from "../config";

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let refreshPromise: Promise<string> | null = null;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const FETCH_TIMEOUT_MS = 15_000;

async function refreshAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    refresh_token: config.google.refreshToken,
    grant_type: "refresh_token",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[${new Date().toISOString()}] ERROR: Token refresh failed:`, error);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;

    console.log(`[${new Date().toISOString()}] Token refreshed, expires in ${data.expires_in}s`);
    return accessToken!;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAccessToken(): Promise<string> {
  if (!accessToken || Date.now() >= tokenExpiresAt - REFRESH_BUFFER_MS) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }
  return accessToken;
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export async function startAutoRefresh(): Promise<void> {
  // Fail-fast: initial token must succeed or startup crashes
  await refreshAccessToken();

  // Auto-refresh every 55 minutes
  refreshInterval = setInterval(() => {
    refreshAccessToken().catch((err) => {
      console.error(`[${new Date().toISOString()}] ERROR: Auto-refresh failed:`, err.message);
      // Retry after 30 seconds
      setTimeout(() => {
        refreshAccessToken().catch((retryErr) => {
          console.error(`[${new Date().toISOString()}] ERROR: Retry refresh failed:`, retryErr.message);
        });
      }, 30_000);
    });
  }, 55 * 60 * 1000);
}

export function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
