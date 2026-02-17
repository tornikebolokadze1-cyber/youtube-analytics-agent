import type { Express, Request, Response } from "express";
import { getOverview, getOverviewWithTrends } from "../services/channel-overview";
import { getTopVideosList, getRetentionCurve } from "../services/video-analytics";
import { getDailyTrend, getPeriodComparison } from "../services/trends";
import { getTrafficSourceBreakdown, getTopSearchTerms } from "../services/traffic-analysis";
import { getDemographicBreakdown, getCountryBreakdown, getDeviceBreakdown, getOSBreakdown } from "../services/audience-insights";
import { getVideoDetails, getChannelInfo } from "../api/data-api";
import { getPlaybackLocations, getSubscriberSources } from "../api/analytics";
import { chatWithGemini, getUIRecommendation } from "../ai/orchestrator";
import { getVideosExtended, getSubscriberStatusBreakdown, getTrafficDetailBreakdown, getVideoDailyTrend, getGrowthVelocity, getContentTopicAnalysis, getPeriodCompare } from "../services/advanced-analytics";
import { validatePeriod, validateLimit, validateVideoId } from "./middleware";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const startTime = Date.now();

// ── Simple in-memory response cache ──────────────────────────
interface CacheEntry { data: unknown; expiresAt: number; }
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  if (entry) responseCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttl = CACHE_TTL): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttl });
}

// Clean stale cache entries every 5 minutes (unref so it doesn't prevent process exit)
const cacheCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (now >= entry.expiresAt) responseCache.delete(key);
  }
}, 5 * 60 * 1000);
cacheCleanup.unref();

function handleError(res: Response, err: unknown, endpoint: string): void {
  console.error(`[${new Date().toISOString()}] ERROR ${endpoint}:`, err);
  res.status(500).json({ error: "Failed to fetch data", endpoint });
}

function parsePeriod(req: Request, res: Response, fallback = 28): number | null {
  const period = validatePeriod(req.query.period ?? fallback);
  if (period === null) {
    res.status(400).json({ error: "Invalid period. Allowed: 7, 28, 90, 365" });
  }
  return period;
}

export function setupApiRoutes(app: Express): void {
  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Channel overview with trends (cached)
  app.get("/api/overview", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const cacheKey = `overview:${period}`;
      const cached = getCached(cacheKey);
      if (cached) { res.json(cached); return; }
      const data = await getOverviewWithTrends(period);
      setCache(cacheKey, data);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/overview");
    }
  });

  // Daily time-series
  app.get("/api/daily", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getDailyTrend(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/daily");
    }
  });

  // Top videos
  app.get("/api/videos", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const limit = validateLimit(req.query.limit);
      if (limit === null) { res.status(400).json({ error: "Invalid limit (1-50)" }); return; }
      const sort = String(req.query.sort || "views");
      const sortParam = sort === "watchtime" ? "-estimatedMinutesWatched" : "-views";
      const data = await getTopVideosList(period, limit, sortParam);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/videos");
    }
  });

  // Traffic sources
  app.get("/api/traffic", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getTrafficSourceBreakdown(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/traffic");
    }
  });

  // Search terms
  app.get("/api/search-terms", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getTopSearchTerms(period, 25);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/search-terms");
    }
  });

  // Demographics
  app.get("/api/demographics", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getDemographicBreakdown(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/demographics");
    }
  });

  // Geography
  app.get("/api/geography", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getCountryBreakdown(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/geography");
    }
  });

  // Devices + OS
  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const [devices, os] = await Promise.all([
        getDeviceBreakdown(period),
        getOSBreakdown(period),
      ]);
      res.json({ devices, os });
    } catch (err) {
      handleError(res, err, "/api/devices");
    }
  });

  // Video retention
  app.get("/api/retention/:videoId", async (req: Request, res: Response) => {
    try {
      const videoId = validateVideoId(req.params.videoId);
      if (!videoId) { res.status(400).json({ error: "Invalid video ID" }); return; }
      const [retention, videoInfo] = await Promise.all([
        getRetentionCurve(videoId),
        getVideoDetails([videoId]),
      ]);
      res.json({
        videoId,
        title: videoInfo[0]?.title || videoId,
        retention,
      });
    } catch (err) {
      handleError(res, err, "/api/retention");
    }
  });

  // Playback locations
  app.get("/api/playback-locations", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getPlaybackLocations(period);
      if (!data.rows?.length) { res.json([]); return; }
      const totalViews = data.rows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
      res.json(data.rows.map((r) => ({
        location: String(r[0]),
        views: Number(r[1]) || 0,
        estimatedMinutesWatched: Number(r[2]) || 0,
        percentage: totalViews > 0 ? Math.round((Number(r[1]) / totalViews) * 1000) / 10 : 0,
      })));
    } catch (err) {
      handleError(res, err, "/api/playback-locations");
    }
  });

  // Subscriber sources
  app.get("/api/subscriber-sources", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getSubscriberSources(period);
      if (!data.rows?.length) { res.json([]); return; }
      res.json(data.rows.map((r) => ({
        status: String(r[0]),
        subscribersGained: Number(r[1]) || 0,
        subscribersLost: Number(r[2]) || 0,
      })));
    } catch (err) {
      handleError(res, err, "/api/subscriber-sources");
    }
  });

  // Trends comparison
  app.get("/api/trends", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getPeriodComparison(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/trends");
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const message = String(req.body?.message || "").trim().slice(0, 1000);
      if (!message) { res.status(400).json({ error: "Message required" }); return; }

      const reply = await chatWithGemini(message);
      res.json({ reply });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ERROR /api/chat:`, err);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  // UI recommendation endpoint
  app.post("/api/ui-suggest", async (req: Request, res: Response) => {
    try {
      const request = String(req.body?.request || "").trim().slice(0, 1000);
      if (!request) { res.status(400).json({ error: "Request body required" }); return; }

      const recommendation = await getUIRecommendation(request);
      res.json(recommendation);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ERROR /api/ui-suggest:`, err);
      res.status(500).json({ error: "UI suggestion failed" });
    }
  });

  // Channel info (real subscriber count)
  app.get("/api/channel-info", async (_req: Request, res: Response) => {
    try {
      const data = await getChannelInfo();
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/channel-info");
    }
  });

  // ═══════════════════════════════════════════════════════
  // Advanced Analytics Endpoints
  // ═══════════════════════════════════════════════════════

  app.get("/api/videos-extended", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const limit = validateLimit(req.query.limit);
      if (limit === null) { res.status(400).json({ error: "Invalid limit (1-50)" }); return; }
      const cacheKey = `videos-ext:${period}:${limit}`;
      const cached = getCached(cacheKey);
      if (cached) { res.json(cached); return; }
      const data = await getVideosExtended(period, limit);
      setCache(cacheKey, data);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/videos-extended");
    }
  });

  app.get("/api/video-daily/:videoId", async (req: Request, res: Response) => {
    try {
      const videoId = validateVideoId(req.params.videoId);
      if (!videoId) { res.status(400).json({ error: "Invalid video ID" }); return; }
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getVideoDailyTrend(videoId, period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/video-daily");
    }
  });

  app.get("/api/subscriber-status", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getSubscriberStatusBreakdown(period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/subscriber-status");
    }
  });

  app.get("/api/traffic-detail/:sourceType", async (req: Request, res: Response) => {
    try {
      const sourceType = String(req.params.sourceType);
      if (!/^[A-Z_]{2,40}$/.test(sourceType)) { res.status(400).json({ error: "Invalid source type" }); return; }
      const period = parsePeriod(req, res); if (period === null) return;
      const data = await getTrafficDetailBreakdown(sourceType, period);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/traffic-detail");
    }
  });

  app.get("/api/velocity", async (req: Request, res: Response) => {
    try {
      const period = parsePeriod(req, res, 90); if (period === null) return;
      const cacheKey = `velocity:${period}`;
      const cached = getCached(cacheKey);
      if (cached) { res.json(cached); return; }
      const data = await getGrowthVelocity(period);
      setCache(cacheKey, data);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/velocity");
    }
  });

  app.get("/api/topics", async (_req: Request, res: Response) => {
    try {
      const cached = getCached("topics:365");
      if (cached) { res.json(cached); return; }
      const data = await getContentTopicAnalysis(365);
      setCache("topics:365", data, 5 * 60 * 1000); // 5 min cache for topics
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/topics");
    }
  });

  app.get("/api/compare", async (req: Request, res: Response) => {
    try {
      const periodA = validatePeriod(req.query.periodA ?? 28);
      const periodB = validatePeriod(req.query.periodB ?? 28);
      if (periodA === null || periodB === null) { res.status(400).json({ error: "Invalid period. Allowed: 7, 28, 90, 365" }); return; }
      const data = await getPeriodCompare(periodA, periodB);
      res.json(data);
    } catch (err) {
      handleError(res, err, "/api/compare");
    }
  });

  // ═══════════════════════════════════════════════════════
  // Control Center Command Endpoint
  // ═══════════════════════════════════════════════════════

  app.post("/api/cc/command", async (req: Request, res: Response) => {
    const requestId = req.body?.request_id || "";

    // Authenticate via X-CC-Auth header
    const authHeader = req.headers["x-cc-auth"];
    if (!process.env.CC_AUTH_SECRET || authHeader !== process.env.CC_AUTH_SECRET) {
      res.status(401).json({ request_id: requestId, status: "error", error: "Unauthorized" });
      return;
    }

    const command = String(req.body?.command || "").trim().toLowerCase();
    const args = String(req.body?.args || "").trim();

    if (!command) {
      res.status(400).json({ request_id: requestId, status: "error", error: "Command required" });
      return;
    }

    try {
      let text = "";

      switch (command) {
        case "overview": {
          const data = await getOverviewWithTrends(28);
          const c = data.current;
          const t = data.trends;
          const fmtTrend = (v: number): string => v > 0 ? `+${v}%` : `${v}%`;
          text = [
            `<b>Channel Overview (Last 28 Days)</b>`,
            ``,
            `<b>Views:</b> ${c.views.toLocaleString()} (${fmtTrend(t.views)})`,
            `<b>Watch Time:</b> ${c.watchTimeHours} hrs (${fmtTrend(t.watchTime)})`,
            `<b>Avg Duration:</b> ${Math.floor(c.averageViewDuration / 60)}:${String(Math.floor(c.averageViewDuration % 60)).padStart(2, "0")} (${fmtTrend(t.avgDuration)})`,
            `<b>Net Subscribers:</b> ${c.netSubscribers >= 0 ? "+" : ""}${c.netSubscribers} (${fmtTrend(t.subscribers)})`,
            `<b>Likes:</b> ${c.likes.toLocaleString()} (${fmtTrend(t.likes)})`,
            `<b>Comments:</b> ${c.comments.toLocaleString()} (${fmtTrend(t.comments)})`,
            `<b>Shares:</b> ${c.shares.toLocaleString()} (${fmtTrend(t.shares)})`,
          ].join("\n");
          break;
        }

        case "videos": {
          const videos = await getTopVideosList(28, 5);
          if (!videos.length) { text = "No video data available for the last 28 days."; break; }
          const lines = videos.map((v, i) =>
            `${i + 1}. <b>${escapeHtml(v.title)}</b>\n   Views: ${v.views.toLocaleString()} | Watch: ${v.watchTimeHours}h | Likes: ${v.likes} | Eng: ${v.engagementRate}%`
          );
          text = `<b>Top 5 Videos (Last 28 Days)</b>\n\n${lines.join("\n\n")}`;
          break;
        }

        case "audience": {
          const demographics = await getDemographicBreakdown(28);
          if (!demographics.length) { text = "No demographic data available."; break; }
          const byAge = new Map<string, { male: number; female: number }>();
          for (const d of demographics) {
            const entry = byAge.get(d.ageGroup) || { male: 0, female: 0 };
            if (d.gender === "male") entry.male = d.viewerPercentage;
            else entry.female = d.viewerPercentage;
            byAge.set(d.ageGroup, entry);
          }
          const lines = [...byAge.entries()].map(([age, v]) =>
            `<b>${escapeHtml(age)}:</b> Male ${v.male.toFixed(1)}% | Female ${v.female.toFixed(1)}%`
          );
          text = `<b>Audience Demographics (Last 28 Days)</b>\n\n${lines.join("\n")}`;
          break;
        }

        case "traffic": {
          const sources = await getTrafficSourceBreakdown(28);
          if (!sources.length) { text = "No traffic data available."; break; }
          const lines = sources.map((s) =>
            `- <b>${escapeHtml(s.source)}:</b> ${s.views.toLocaleString()} views (${s.percentage}%)`
          );
          text = `<b>Traffic Sources (Last 28 Days)</b>\n\n${lines.join("\n")}`;
          break;
        }

        case "trends": {
          const trends = await getPeriodComparison(28);
          if (!trends.length) { text = "No trend data available."; break; }
          const arrow = (d: string): string => d === "up" ? "+" : d === "down" ? "-" : "=";
          const lines = trends.map((t) =>
            `<b>${escapeHtml(t.metric)}:</b> ${t.current.toLocaleString()} (${arrow(t.direction as string)}${t.changePercent}%)`
          );
          text = `<b>Trend Comparison (Last 28 Days vs Previous)</b>\n\n${lines.join("\n")}`;
          break;
        }

        case "report": {
          const [overviewData, videos] = await Promise.all([
            getOverviewWithTrends(28),
            getTopVideosList(28, 5),
          ]);
          const c = overviewData.current;
          const t = overviewData.trends;
          const fmtTrend = (v: number): string => v > 0 ? `+${v}%` : `${v}%`;
          const overviewLines = [
            `<b>Channel Overview</b>`,
            `Views: ${c.views.toLocaleString()} (${fmtTrend(t.views)})`,
            `Watch Time: ${c.watchTimeHours} hrs (${fmtTrend(t.watchTime)})`,
            `Net Subscribers: ${c.netSubscribers >= 0 ? "+" : ""}${c.netSubscribers} (${fmtTrend(t.subscribers)})`,
            `Likes: ${c.likes.toLocaleString()} (${fmtTrend(t.likes)})`,
            `Comments: ${c.comments.toLocaleString()} (${fmtTrend(t.comments)})`,
          ];
          const videoLines = videos.length
            ? videos.map((v, i) => `${i + 1}. <b>${escapeHtml(v.title)}</b> — ${v.views.toLocaleString()} views, ${v.watchTimeHours}h`)
            : ["No video data available."];
          text = [
            `<b>Full Report (Last 28 Days)</b>`,
            ``,
            ...overviewLines,
            ``,
            `<b>Top Videos</b>`,
            ...videoLines,
          ].join("\n");
          break;
        }

        case "chat": {
          if (!args) { text = "Please provide a message after the command. Usage: /chat your question here"; break; }
          text = await chatWithGemini(args);
          break;
        }

        default:
          text = `Unknown command: <b>${escapeHtml(command)}</b>\n\nAvailable: overview, videos, audience, traffic, trends, report, chat`;
      }

      res.json({
        request_id: requestId,
        status: "completed",
        response_type: "text",
        text,
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ERROR /api/cc/command (${command}):`, err);
      res.json({
        request_id: requestId,
        status: "completed",
        response_type: "text",
        text: `Error executing <b>${escapeHtml(command)}</b>: ${escapeHtml(err instanceof Error ? err.message : "Unknown error")}`,
        parse_mode: "HTML",
      });
    }
  });
}
