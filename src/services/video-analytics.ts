import { getTopVideos, getVideoRetention } from "../api/analytics";
import { getVideoDetails } from "../api/data-api";
import type { TopVideo, RetentionPoint } from "../api/types";

export async function getTopVideosList(days = 28, limit = 20, sortBy = "-views"): Promise<TopVideo[]> {
  const response = await getTopVideos(days, limit, sortBy);
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

    return {
      videoId,
      title: meta?.title || videoId,
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

export async function getRetentionCurve(videoId: string): Promise<RetentionPoint[]> {
  const response = await getVideoRetention(videoId);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => ({
    elapsedRatio: Number(row[0]),
    watchRatio: Number(row[1]),
  }));
}
