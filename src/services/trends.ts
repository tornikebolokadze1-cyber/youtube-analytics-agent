import { getChannelOverview, getDailyMetrics } from "../api/analytics";
import type { TrendComparison, DailyMetric } from "../api/types";

export async function getPeriodComparison(days = 28): Promise<TrendComparison[]> {
  // Fetch current period and double to extract previous period
  const [currentRes, doubleRes] = await Promise.all([
    getChannelOverview(days),
    getChannelOverview(days * 2),
  ]);

  if (!currentRes.rows?.length || !doubleRes.rows?.length) return [];

  const curr = currentRes.rows[0];
  const total = doubleRes.rows[0];

  const metrics = [
    { name: "ნახვები / Views", currIdx: 0 },
    { name: "ყურების დრო (წთ) / Watch Time", currIdx: 1 },
    { name: "საშუალო ხანგრძლივობა / Avg Duration", currIdx: 2 },
    { name: "გამომწერები + / Subscribers Gained", currIdx: 3 },
    { name: "გამომწერები - / Subscribers Lost", currIdx: 4 },
    { name: "მოწონებები / Likes", currIdx: 5 },
    { name: "კომენტარები / Comments", currIdx: 6 },
    { name: "გაზიარებები / Shares", currIdx: 7 },
  ];

  // For averageViewDuration (idx 2), subtraction of averages is invalid.
  // Compute previous avg from total minutes / total views instead.
  const currViews = Number(curr[0]) || 0;
  const totalViews = Number(total[0]) || 0;
  const prevViews = totalViews - currViews;
  const currMinutes = Number(curr[1]) || 0;
  const totalMinutes = Number(total[1]) || 0;
  const prevMinutes = totalMinutes - currMinutes;
  const prevAvgDuration = prevViews > 0 ? Math.round((prevMinutes * 60) / prevViews) : Number(curr[2]) || 0;

  return metrics.map(({ name, currIdx }) => {
    const current = Number(curr[currIdx]) || 0;
    // For averageViewDuration, use computed previous avg instead of subtraction
    const previous = currIdx === 2 ? prevAvgDuration : (Number(total[currIdx]) || 0) - current;
    const changePercent = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;

    return {
      metric: name,
      current,
      previous,
      changePercent,
      direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
    };
  });
}

export async function getDailyTrend(days = 28): Promise<DailyMetric[]> {
  const response = await getDailyMetrics(days);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => {
    const estimatedMinutesWatched = Number(row[2]) || 0;
    return {
      date: String(row[0]),
      views: Number(row[1]) || 0,
      estimatedMinutesWatched,
      watchTimeHours: Math.round((estimatedMinutesWatched / 60) * 10) / 10,
      averageViewDuration: Number(row[3]) || 0,
      subscribersGained: Number(row[4]) || 0,
      likes: Number(row[5]) || 0,
      comments: Number(row[6]) || 0,
      shares: Number(row[7]) || 0,
    };
  });
}
