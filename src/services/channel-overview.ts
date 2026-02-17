import { getChannelOverview } from "../api/analytics";
import type { ChannelOverview, OverviewResponse } from "../api/types";

function parseOverview(rows: (string | number)[][], period: string, startDate: string, endDate: string): ChannelOverview {
  if (!rows.length) {
    return {
      views: 0,
      estimatedMinutesWatched: 0,
      watchTimeHours: 0,
      averageViewDuration: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      netSubscribers: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      period,
      startDate,
      endDate,
    };
  }

  const row = rows[0];
  const views = Number(row[0]) || 0;
  const estimatedMinutesWatched = Number(row[1]) || 0;
  const averageViewDuration = Number(row[2]) || 0;
  const subscribersGained = Number(row[3]) || 0;
  const subscribersLost = Number(row[4]) || 0;
  const likes = Number(row[5]) || 0;
  const comments = Number(row[6]) || 0;
  const shares = Number(row[7]) || 0;

  return {
    views,
    estimatedMinutesWatched,
    watchTimeHours: Math.round((estimatedMinutesWatched / 60) * 10) / 10,
    averageViewDuration,
    subscribersGained,
    subscribersLost,
    netSubscribers: subscribersGained - subscribersLost,
    likes,
    comments,
    shares,
    period,
    startDate,
    endDate,
  };
}

export async function getOverview(days = 28): Promise<ChannelOverview> {
  const response = await getChannelOverview(days);
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return parseOverview(
    response.rows || [],
    `${days}d`,
    start.toISOString().split("T")[0],
    end.toISOString().split("T")[0]
  );
}

export async function getOverviewWithTrends(days = 28): Promise<OverviewResponse> {
  const [current, doubled] = await Promise.all([
    getOverview(days),
    getOverview(days * 2), // Get double the period to derive previous
  ]);

  // Derive previous period by subtracting current from the doubled total
  const prevViews = (doubled.views || 0) - (current.views || 0);
  const prevWatchTime = (doubled.watchTimeHours || 0) - (current.watchTimeHours || 0);
  const prevSubs = (doubled.netSubscribers || 0) - (current.netSubscribers || 0);
  const prevLikes = (doubled.likes || 0) - (current.likes || 0);
  const prevComments = (doubled.comments || 0) - (current.comments || 0);
  const prevShares = (doubled.shares || 0) - (current.shares || 0);

  // For averageViewDuration: can't subtract averages. Compute from total minutes / total views.
  const prevMinutes = (doubled.estimatedMinutesWatched || 0) - (current.estimatedMinutesWatched || 0);
  const prevDuration = prevViews > 0 ? (prevMinutes * 60) / prevViews : current.averageViewDuration;

  // Build proper previous period object with correct dates
  const end = new Date();
  end.setDate(end.getDate() - 1 - days);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  const previous: ChannelOverview = {
    views: prevViews,
    estimatedMinutesWatched: prevMinutes,
    watchTimeHours: Math.round((prevMinutes / 60) * 10) / 10,
    averageViewDuration: Math.round(prevDuration),
    subscribersGained: (doubled.subscribersGained || 0) - (current.subscribersGained || 0),
    subscribersLost: (doubled.subscribersLost || 0) - (current.subscribersLost || 0),
    netSubscribers: prevSubs,
    likes: prevLikes,
    comments: prevComments,
    shares: prevShares,
    period: `${days}d`,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };

  function calcTrend(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  return {
    current,
    previous,
    trends: {
      views: calcTrend(current.views, prevViews),
      watchTime: calcTrend(current.watchTimeHours, prevWatchTime),
      subscribers: calcTrend(current.netSubscribers, prevSubs),
      avgDuration: calcTrend(current.averageViewDuration, prevDuration),
      likes: calcTrend(current.likes, prevLikes),
      comments: calcTrend(current.comments, prevComments),
      shares: calcTrend(current.shares, prevShares),
    },
  };
}
