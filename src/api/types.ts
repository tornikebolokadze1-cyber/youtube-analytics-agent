// YouTube Analytics API v2 response
export interface AnalyticsResponse {
  kind: string;
  columnHeaders: ColumnHeader[];
  rows: (string | number)[][];
}

export interface ColumnHeader {
  name: string;
  columnType: string;
  dataType: string;
}

// Parsed analytics data
export interface ChannelOverview {
  views: number;
  estimatedMinutesWatched: number;
  watchTimeHours: number;
  averageViewDuration: number;
  subscribersGained: number;
  subscribersLost: number;
  netSubscribers: number;
  likes: number;
  comments: number;
  shares: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface DailyMetric {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  watchTimeHours: number;
  averageViewDuration: number;
  subscribersGained: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface TopVideo {
  videoId: string;
  title: string;
  views: number;
  estimatedMinutesWatched: number;
  watchTimeHours: number;
  averageViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface TrafficSource {
  source: string;
  views: number;
  estimatedMinutesWatched: number;
  percentage: number;
}

export interface SearchTerm {
  term: string;
  views: number;
  estimatedMinutesWatched: number;
}

export interface DemographicEntry {
  ageGroup: string;
  gender: string;
  viewerPercentage: number;
}

export interface CountryStats {
  country: string;
  views: number;
  estimatedMinutesWatched: number;
  percentage: number;
}

export interface DeviceStats {
  deviceType: string;
  views: number;
  estimatedMinutesWatched: number;
  percentage: number;
}

export interface OSStats {
  operatingSystem: string;
  views: number;
  estimatedMinutesWatched: number;
  percentage: number;
}

export interface RetentionPoint {
  elapsedRatio: number;
  watchRatio: number;
}

export interface SubscriberSource {
  status: string;
  subscribersGained: number;
  subscribersLost: number;
}

export interface PlaybackLocation {
  locationType: string;
  views: number;
  estimatedMinutesWatched: number;
}

// YouTube Data API v3
export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelTitle: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
}

// Dashboard API response types
export interface OverviewResponse {
  current: ChannelOverview;
  previous: ChannelOverview;
  trends: {
    views: number;
    watchTime: number;
    subscribers: number;
    avgDuration: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface TrendComparison {
  metric: string;
  current: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
}

// Extended video with metadata + analytics
export interface ExtendedVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  isShort: boolean;
  views: number;
  estimatedMinutesWatched: number;
  watchTimeHours: number;
  averageViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

// Subscriber status breakdown
export interface SubscriberStatusMetrics {
  status: string;
  views: number;
  estimatedMinutesWatched: number;
  likes: number;
  comments: number;
  shares: number;
}

// Growth velocity data point
export interface VelocityPoint {
  date: string;
  views: number;
  subscribersGained: number;
  subscribersLost: number;
  netSubscribers: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeHours: number;
}

// Content topic group
export interface TopicGroup {
  topic: string;
  videoCount: number;
  totalViews: number;
  avgViews: number;
  avgEngagement: number;
  totalWatchTimeHours: number;
}

// Period comparison result
export interface PeriodCompareResult {
  periodA: {
    label: string;
    views: number;
    watchTimeHours: number;
    subscribers: number;
    likes: number;
    comments: number;
    shares: number;
    avgDuration: number;
  };
  periodB: {
    label: string;
    views: number;
    watchTimeHours: number;
    subscribers: number;
    likes: number;
    comments: number;
    shares: number;
    avgDuration: number;
  };
  changes: {
    views: number;
    watchTimeHours: number;
    subscribers: number;
    likes: number;
    comments: number;
    shares: number;
    avgDuration: number;
  };
}
