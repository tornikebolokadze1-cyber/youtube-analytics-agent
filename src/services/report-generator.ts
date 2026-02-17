import { getOverview } from "./channel-overview";
import { getTopVideosList } from "./video-analytics";
import { getTrafficSourceBreakdown, getTopSearchTerms } from "./traffic-analysis";
import { getDemographicBreakdown, getCountryBreakdown } from "./audience-insights";
import { getPeriodComparison } from "./trends";

export interface FullReport {
  overview: Awaited<ReturnType<typeof getOverview>>;
  topVideos: Awaited<ReturnType<typeof getTopVideosList>>;
  traffic: Awaited<ReturnType<typeof getTrafficSourceBreakdown>>;
  searchTerms: Awaited<ReturnType<typeof getTopSearchTerms>>;
  demographics: Awaited<ReturnType<typeof getDemographicBreakdown>>;
  countries: Awaited<ReturnType<typeof getCountryBreakdown>>;
  trends: Awaited<ReturnType<typeof getPeriodComparison>>;
  generatedAt: string;
  period: string;
}

export async function generateFullReport(type: "weekly" | "monthly" = "weekly"): Promise<FullReport> {
  const days = type === "weekly" ? 7 : 30;

  const [overview, topVideos, traffic, searchTerms, demographics, countries, trends] = await Promise.all([
    getOverview(days),
    getTopVideosList(days, 10),
    getTrafficSourceBreakdown(days),
    getTopSearchTerms(days, 15),
    getDemographicBreakdown(days),
    getCountryBreakdown(days),
    getPeriodComparison(days),
  ]);

  return {
    overview,
    topVideos,
    traffic,
    searchTerms,
    demographics,
    countries,
    trends,
    generatedAt: new Date().toISOString(),
    period: type,
  };
}
