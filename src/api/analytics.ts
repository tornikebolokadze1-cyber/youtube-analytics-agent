import { getAccessToken } from "../auth/token-manager";
import { config } from "../config";
import type { AnalyticsResponse } from "./types";

const BASE_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const CHANNEL_ID = config.youtube.channelId;

async function queryAnalytics(params: Record<string, string>, retries = 3): Promise<AnalyticsResponse> {
  const token = await getAccessToken();
  const searchParams = new URLSearchParams({
    ids: `channel==${CHANNEL_ID}`,
    ...params,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 30_000);
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(fetchTimer);

      if (response.status === 403) {
        const body = await response.text();
        console.error(`[${new Date().toISOString()}] 403 Forbidden:`, body);
        throw new Error(`YouTube API 403: insufficient permissions`);
      }

      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      return data as AnalyticsResponse;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.error(`[${new Date().toISOString()}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("All retries exhausted");
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // Yesterday (analytics data has ~2 day lag)
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// 1. Channel Overview
export async function getChannelOverview(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares",
  });
}

// 2. Daily Metrics (time series)
export async function getDailyMetrics(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,comments,shares",
    dimensions: "day",
    sort: "day",
  });
}

// 3. Top Videos
export async function getTopVideos(days = 28, maxResults = 20, sortBy = "-views"): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares",
    dimensions: "video",
    sort: sortBy,
    maxResults: String(maxResults),
  });
}

// 4. Traffic Sources
export async function getTrafficSources(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceType",
    sort: "-views",
  });
}

// 5. Search Terms
export async function getSearchTerms(days = 28, maxResults = 25): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceDetail",
    filters: "insightTrafficSourceType==YT_SEARCH",
    sort: "-views",
    maxResults: String(maxResults),
  });
}

// 6. Demographics (age + gender)
export async function getDemographics(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "viewerPercentage",
    dimensions: "ageGroup,gender",
  });
}

// 7. Geography (countries)
export async function getGeography(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "country",
    sort: "-views",
  });
}

// 8. Device Types
export async function getDeviceTypes(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "deviceType",
  });
}

// 9. Operating Systems
export async function getOperatingSystems(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "operatingSystem",
  });
}

// 10. Video Retention
export async function getVideoRetention(videoId: string): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(365);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "audienceWatchRatio",
    dimensions: "elapsedVideoTimeRatio",
    filters: `video==${videoId}`,
  });
}

// 11. Subscriber Sources (by country — traffic source dimension not supported with subscriber metrics)
export async function getSubscriberSources(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "subscribersGained,subscribersLost",
    dimensions: "country",
    sort: "-subscribersGained",
    maxResults: "15",
  });
}

// 12. Playback Locations
export async function getPlaybackLocations(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightPlaybackLocationType",
  });
}

// 13. Subscriber Status Metrics (views/watchTime by subscriber type)
export async function getSubscriberStatusMetrics(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,likes,comments,shares",
    dimensions: "subscribedStatus",
  });
}

// 14. Traffic Source Detail (breakdown within a source type)
export async function getTrafficSourceDetail(sourceType: string, days = 28, maxResults = 25): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceDetail",
    filters: `insightTrafficSourceType==${sourceType}`,
    sort: "-views",
    maxResults: String(maxResults),
  });
}

// 15. Per-video daily metrics
export async function getVideoDailyMetrics(videoId: string, days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,likes,comments,shares",
    dimensions: "day",
    filters: `video==${videoId}`,
    sort: "day",
  });
}

// 16. Daily metrics with subscribers lost (for velocity)
export async function getDailyMetricsExtended(days = 28): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(days);
  return queryAnalytics({
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares",
    dimensions: "day",
    sort: "day",
  });
}

export { getDateRange };
