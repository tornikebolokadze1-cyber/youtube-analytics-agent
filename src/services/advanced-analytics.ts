import { getTopVideos, getSubscriberStatusMetrics, getTrafficSourceDetail, getVideoDailyMetrics, getDailyMetricsExtended } from "../api/analytics";
import { getVideoDetails } from "../api/data-api";
import type { ExtendedVideo, SubscriberStatusMetrics, VelocityPoint, TopicGroup, PeriodCompareResult } from "../api/types";
import { getOverview } from "./channel-overview";

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(iso: string): number {
  let hours = 0, minutes = 0, seconds = 0;
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  const s = iso.match(/(\d+)S/);
  if (h) hours = parseInt(h[1], 10);
  if (m) minutes = parseInt(m[1], 10);
  if (s) seconds = parseInt(s[1], 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// ── Extended Videos (analytics + metadata) ──
export async function getVideosExtended(days = 28, limit = 200): Promise<ExtendedVideo[]> {
  const response = await getTopVideos(days, limit, "-views");
  if (!response.rows?.length) return [];

  const videoIds = response.rows.map((row) => String(row[0]));
  const metadata = await getVideoDetails(videoIds);
  const metaMap = new Map(metadata.map((m) => [m.id, m]));

  return response.rows.map((row) => {
    const videoId = String(row[0]);
    const views = Number(row[1]) || 0;
    const estimatedMinutesWatched = Number(row[2]) || 0;
    const likes = Number(row[4]) || 0;
    const comments = Number(row[5]) || 0;
    const shares = Number(row[6]) || 0;
    const meta = metaMap.get(videoId);
    const durationSeconds = meta ? parseDuration(meta.duration) : 0;

    return {
      videoId,
      title: meta?.title || videoId,
      thumbnailUrl: meta?.thumbnailUrl || "",
      publishedAt: meta?.publishedAt || "",
      duration: meta?.duration || "PT0S",
      durationSeconds,
      isShort: durationSeconds > 0 && durationSeconds <= 60,
      views,
      estimatedMinutesWatched,
      watchTimeHours: Math.round((estimatedMinutesWatched / 60) * 10) / 10,
      averageViewDuration: Number(row[3]) || 0,
      likes,
      comments,
      shares,
      engagementRate: views > 0 ? Math.round(((likes + comments + shares) / views) * 10000) / 100 : 0,
    };
  });
}

// ── Subscriber Status Breakdown ──
export async function getSubscriberStatusBreakdown(days = 28): Promise<SubscriberStatusMetrics[]> {
  const response = await getSubscriberStatusMetrics(days);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => ({
    status: String(row[0]),
    views: Number(row[1]) || 0,
    estimatedMinutesWatched: Number(row[2]) || 0,
    likes: Number(row[3]) || 0,
    comments: Number(row[4]) || 0,
    shares: Number(row[5]) || 0,
  }));
}

// ── Traffic Source Detail ──
export async function getTrafficDetailBreakdown(sourceType: string, days = 28): Promise<Array<{ detail: string; views: number; estimatedMinutesWatched: number; percentage: number }>> {
  const response = await getTrafficSourceDetail(sourceType, days);
  if (!response.rows?.length) return [];

  const totalViews = response.rows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
  return response.rows.map((row) => {
    const views = Number(row[1]) || 0;
    return {
      detail: String(row[0]),
      views,
      estimatedMinutesWatched: Number(row[2]) || 0,
      percentage: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
    };
  });
}

// ── Video Daily Metrics ──
export async function getVideoDailyTrend(videoId: string, days = 28): Promise<Array<{ date: string; views: number; likes: number; comments: number; shares: number; watchTimeHours: number }>> {
  const response = await getVideoDailyMetrics(videoId, days);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => ({
    date: String(row[0]),
    views: Number(row[1]) || 0,
    watchTimeHours: Math.round(((Number(row[2]) || 0) / 60) * 10) / 10,
    likes: Number(row[3]) || 0,
    comments: Number(row[4]) || 0,
    shares: Number(row[5]) || 0,
  }));
}

// ── Growth Velocity ──
export async function getGrowthVelocity(days = 90): Promise<VelocityPoint[]> {
  const response = await getDailyMetricsExtended(days);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => {
    const subsGained = Number(row[4]) || 0;
    const subsLost = Number(row[5]) || 0;
    return {
      date: String(row[0]),
      views: Number(row[1]) || 0,
      watchTimeHours: Math.round(((Number(row[2]) || 0) / 60) * 10) / 10,
      subscribersGained: subsGained,
      subscribersLost: subsLost,
      netSubscribers: subsGained - subsLost,
      likes: Number(row[6]) || 0,
      comments: Number(row[7]) || 0,
      shares: Number(row[8]) || 0,
    };
  });
}

// ── Content Topic Analysis ──
const STOP_WORDS = new Set(["და", "ის", "ეს", "რა", "რომ", "არ", "ან", "თუ", "მე", "შენ", "ჩვენ", "ერთ", "ყველა", "რატომ", "როგორ", "სად", "ვინ", "რას", "|", "-", "—", "#", "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "is", "it", "from", "how", "what", "why", "who", "when", "where", "this", "that", "are", "was", "were", "been", "will", "can", "has", "have", "had", "not", "but", "and", "you", "your", "new", "all", "about", "more", "best", "top"]);

export async function getContentTopicAnalysis(days = 365): Promise<TopicGroup[]> {
  const videos = await getVideosExtended(days, 200);
  if (!videos.length) return [];

  // Extract topic keywords from titles
  const topicMap = new Map<string, ExtendedVideo[]>();

  for (const v of videos) {
    const words = v.title
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

    for (const word of words) {
      const key = word.toLowerCase();
      const list = topicMap.get(key) || [];
      list.push(v);
      topicMap.set(key, list);
    }
  }

  // Only keep topics with 2+ videos
  const groups: TopicGroup[] = [];
  for (const [topic, vids] of topicMap) {
    if (vids.length < 2) continue;
    const totalViews = vids.reduce((s, v) => s + v.views, 0);
    const totalEng = vids.reduce((s, v) => s + v.engagementRate, 0);
    const totalWH = vids.reduce((s, v) => s + v.watchTimeHours, 0);
    groups.push({
      topic,
      videoCount: vids.length,
      totalViews,
      avgViews: Math.round(totalViews / vids.length),
      avgEngagement: Math.round((totalEng / vids.length) * 100) / 100,
      totalWatchTimeHours: Math.round(totalWH * 10) / 10,
    });
  }

  groups.sort((a, b) => b.totalViews - a.totalViews);
  return groups.slice(0, 20);
}

// ── Period Comparison ──
export async function getPeriodCompare(periodA: number, periodB: number): Promise<PeriodCompareResult> {
  const [a, b] = await Promise.all([
    getOverview(periodA),
    getOverview(periodB),
  ]);

  function pct(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  return {
    periodA: {
      label: `${periodA} დღე`,
      views: a.views,
      watchTimeHours: a.watchTimeHours,
      subscribers: a.netSubscribers,
      likes: a.likes,
      comments: a.comments,
      shares: a.shares,
      avgDuration: a.averageViewDuration,
    },
    periodB: {
      label: `${periodB} დღე`,
      views: b.views,
      watchTimeHours: b.watchTimeHours,
      subscribers: b.netSubscribers,
      likes: b.likes,
      comments: b.comments,
      shares: b.shares,
      avgDuration: b.averageViewDuration,
    },
    changes: {
      views: pct(a.views, b.views),
      watchTimeHours: pct(a.watchTimeHours, b.watchTimeHours),
      subscribers: pct(a.netSubscribers, b.netSubscribers),
      likes: pct(a.likes, b.likes),
      comments: pct(a.comments, b.comments),
      shares: pct(a.shares, b.shares),
      avgDuration: pct(a.averageViewDuration, b.averageViewDuration),
    },
  };
}
