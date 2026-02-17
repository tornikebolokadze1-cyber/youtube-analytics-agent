import { getDemographics, getGeography, getDeviceTypes, getOperatingSystems } from "../api/analytics";
import type { DemographicEntry, CountryStats, DeviceStats, OSStats } from "../api/types";

export async function getDemographicBreakdown(days = 28): Promise<DemographicEntry[]> {
  const response = await getDemographics(days);
  if (!response.rows?.length) return [];

  return response.rows.map((row) => ({
    ageGroup: String(row[0]),
    gender: String(row[1]),
    viewerPercentage: Number(row[2]) || 0,
  }));
}

export async function getCountryBreakdown(days = 28): Promise<CountryStats[]> {
  const response = await getGeography(days);
  if (!response.rows?.length) return [];

  const totalViews = response.rows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0);

  return response.rows.map((row) => {
    const views = Number(row[1]) || 0;
    return {
      country: String(row[0]),
      views,
      estimatedMinutesWatched: Number(row[2]) || 0,
      percentage: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
    };
  });
}

export async function getDeviceBreakdown(days = 28): Promise<DeviceStats[]> {
  const response = await getDeviceTypes(days);
  if (!response.rows?.length) return [];

  const totalViews = response.rows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0);

  return response.rows.map((row) => {
    const views = Number(row[1]) || 0;
    return {
      deviceType: String(row[0]),
      views,
      estimatedMinutesWatched: Number(row[2]) || 0,
      percentage: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
    };
  });
}

export async function getOSBreakdown(days = 28): Promise<OSStats[]> {
  const response = await getOperatingSystems(days);
  if (!response.rows?.length) return [];

  const totalViews = response.rows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0);

  return response.rows.map((row) => {
    const views = Number(row[1]) || 0;
    return {
      operatingSystem: String(row[0]),
      views,
      estimatedMinutesWatched: Number(row[2]) || 0,
      percentage: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
    };
  });
}
