import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

// ── Auth middleware ──────────────────────────────────────────
export function apiAuth(req: Request, res: Response, next: NextFunction): void {
  const token = config.server.dashboardApiToken;
  // If no token configured, skip auth (development convenience)
  if (!token) { next(); return; }

  // Accept token via header (programmatic access)
  const provided = req.headers["x-dashboard-token"];
  if (provided === token) { next(); return; }

  // Accept token via cookie (browser dashboard access)
  const cookieToken = parseCookie(req.headers.cookie || "", "dashboard_token");
  if (cookieToken === token) { next(); return; }

  res.status(401).json({ error: "Unauthorized", message: "Missing or invalid x-dashboard-token header" });
}

export function parseCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.substring(name.length + 1)) : undefined;
}

// ── Simple in-memory rate limiter ────────────────────────────
interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

function clientKey(req: Request): string {
  return (req.headers["x-forwarded-for"] as string || req.ip || "unknown").split(",")[0].trim();
}

// Clean up stale buckets every 5 minutes (unref so it doesn't prevent process exit)
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000);
rateLimitCleanup.unref();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${clientKey(req)}:${req.path}:${windowMs}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > maxRequests) {
      res.status(429).json({ error: "Too many requests", retryAfter: Math.ceil((bucket.resetAt - now) / 1000) });
      return;
    }
    next();
  };
}

// ── Parameter validation helpers ────────────────────────────
const ALLOWED_PERIODS = new Set([7, 28, 90, 365]);

export function validatePeriod(raw: unknown): number | null {
  const n = parseInt(String(raw || "28"), 10);
  return ALLOWED_PERIODS.has(n) ? n : null;
}

export function validateLimit(raw: unknown, max = 200): number | null {
  const n = parseInt(String(raw || "20"), 10);
  return (Number.isFinite(n) && n >= 1 && n <= max) ? n : null;
}

export function validateVideoId(raw: unknown): string | null {
  const id = String(raw || "");
  // YouTube video IDs: 11 chars, alphanumeric + _ + -
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
