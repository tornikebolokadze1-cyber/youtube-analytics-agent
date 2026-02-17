import { getAccessToken } from "../auth/token-manager";
import { config } from "../config";
import type { VideoMetadata, ChannelInfo } from "./types";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

async function youtubeRequest(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const searchParams = new URLSearchParams(params);
  const url = `${BASE_URL}/${endpoint}?${searchParams.toString()}`;

  const controller = new AbortController();
  const fetchTimer = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  });
  clearTimeout(fetchTimer);

  if (!response.ok) {
    throw new Error(`YouTube Data API error ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export async function getVideoDetails(videoIds: string[]): Promise<VideoMetadata[]> {
  if (videoIds.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const batchResults = await Promise.all(
    batches.map(batch => youtubeRequest("videos", {
      part: "snippet,contentDetails,statistics",
      id: batch.join(","),
    }))
  );

  const results: VideoMetadata[] = [];
  for (const data of batchResults) {
    const items = (data.items || []) as Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
        channelTitle: string;
      };
      contentDetails: { duration: string };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;

    for (const item of items) {
      results.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
        channelTitle: item.snippet.channelTitle,
        duration: item.contentDetails.duration,
        viewCount: parseInt(item.statistics.viewCount || "0", 10),
        likeCount: parseInt(item.statistics.likeCount || "0", 10),
        commentCount: parseInt(item.statistics.commentCount || "0", 10),
      });
    }
  }

  return results;
}

export async function getChannelInfo(): Promise<ChannelInfo> {
  const data = await youtubeRequest("channels", {
    part: "snippet,statistics",
    id: config.youtube.channelId,
  });

  const items = (data.items || []) as Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl: string;
      thumbnails: { medium?: { url: string }; default?: { url: string } };
      publishedAt: string;
    };
    statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string };
  }>;

  const channel = items[0];
  if (!channel) {
    throw new Error("Channel not found");
  }

  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    customUrl: channel.snippet.customUrl,
    thumbnailUrl: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url || "",
    subscriberCount: parseInt(channel.statistics.subscriberCount || "0", 10),
    videoCount: parseInt(channel.statistics.videoCount || "0", 10),
    viewCount: parseInt(channel.statistics.viewCount || "0", 10),
    publishedAt: channel.snippet.publishedAt,
  };
}
