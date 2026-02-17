import { getTrafficSources, getSearchTerms } from "../api/analytics";
import type { TrafficSource, SearchTerm } from "../api/types";

export async function getTrafficSourceBreakdown(days = 28): Promise<TrafficSource[]> {
  const response = await getTrafficSources(days);
  if (!response.rows?.length) return [];

  const totalViews = response.rows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0);

  return response.rows.map((row) => {
    const views = Number(row[1]) || 0;
    return {
      source: String(row[0]),
      views,
      estimatedMinutesWatched: Number(row[2]) || 0,
      percentage: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
    };
  });
}

export async function getTopSearchTerms(days = 28, limit = 25): Promise<SearchTerm[]> {
  const response = await getSearchTerms(days, limit);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => ({
    term: String(row[0]),
    views: Number(row[1]) || 0,
    estimatedMinutesWatched: Number(row[2]) || 0,
  }));
}
