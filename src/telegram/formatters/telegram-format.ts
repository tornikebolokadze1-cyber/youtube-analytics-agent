import type {
  ChannelOverview,
  TopVideo,
  TrafficSource,
  SearchTerm,
  DemographicEntry,
  CountryStats,
  DeviceStats,
  RetentionPoint,
  TrendComparison,
} from "../../api/types";
import type { FullReport } from "../../services/report-generator";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function progressBar(percent: number, length = 10): string {
  const filled = Math.round((percent / 100) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

function trendArrow(val: number): string {
  if (val > 0) return `↑ ${val}%`;
  if (val < 0) return `↓ ${Math.abs(val)}%`;
  return "→ 0%";
}

export function formatOverview(data: ChannelOverview): string {
  return `📊 <b>არხის მიმოხილვა</b> (${data.period})
━━━━━━━━━━━━━━━━━
📅 ${data.startDate} — ${data.endDate}

👁 ნახვები: <b>${formatNumber(data.views)}</b>
⏱ ყურების დრო: <b>${data.watchTimeHours} სთ</b>
📏 საშ. ხანგრძლივობა: <b>${formatDuration(data.averageViewDuration)}</b>
👥 გამომწერები: <b>+${formatNumber(data.subscribersGained)}</b> / <b>-${formatNumber(data.subscribersLost)}</b> (წმინდა: <b>${data.netSubscribers >= 0 ? "+" : ""}${data.netSubscribers}</b>)
👍 მოწონებები: <b>${formatNumber(data.likes)}</b>
💬 კომენტარები: <b>${formatNumber(data.comments)}</b>
🔗 გაზიარებები: <b>${formatNumber(data.shares)}</b>`;
}

export function formatTopVideos(videos: TopVideo[]): string {
  if (!videos.length) return "❌ ვიდეოები ვერ მოიძებნა.";

  let text = `🔝 <b>ტოპ ${videos.length} ვიდეო</b>\n━━━━━━━━━━━━━━━━━\n`;

  videos.forEach((v, i) => {
    const title = v.title.length > 40 ? v.title.substring(0, 37) + "..." : v.title;
    text += `\n${i + 1}. <b>${escapeHtml(title)}</b>\n`;
    text += `   👁 ${formatNumber(v.views)} | ⏱ ${v.watchTimeHours}სთ | 👍 ${formatNumber(v.likes)} | 📊 ${v.engagementRate}%\n`;
  });

  return text;
}

export function formatTrafficSources(sources: TrafficSource[]): string {
  if (!sources.length) return "❌ ტრაფიკის მონაცემები არ არის.";

  let text = `🔍 <b>ტრაფიკის წყაროები</b>\n━━━━━━━━━━━━━━━━━\n`;

  for (const s of sources) {
    text += `\n${escapeHtml(s.source)}\n`;
    text += `${progressBar(s.percentage)} ${s.percentage}% (${formatNumber(s.views)} ნახვა)\n`;
  }

  return text;
}

export function formatSearchTerms(terms: SearchTerm[]): string {
  if (!terms.length) return "❌ საძიებო ტერმინები ვერ მოიძებნა.";

  let text = `🔎 <b>ტოპ საძიებო ტერმინები</b>\n━━━━━━━━━━━━━━━━━\n`;

  terms.slice(0, 15).forEach((t, i) => {
    text += `${i + 1}. "${escapeHtml(t.term)}" — ${formatNumber(t.views)} ნახვა\n`;
  });

  return text;
}

export function formatDemographics(data: DemographicEntry[]): string {
  if (!data.length) return "❌ დემოგრაფიული მონაცემები არ არის.";

  let text = `👥 <b>აუდიტორიის დემოგრაფია</b>\n━━━━━━━━━━━━━━━━━\n`;

  // Group by age
  const byAge = new Map<string, { male: number; female: number }>();
  for (const d of data) {
    const existing = byAge.get(d.ageGroup) || { male: 0, female: 0 };
    if (d.gender === "male") existing.male = d.viewerPercentage;
    else existing.female = d.viewerPercentage;
    byAge.set(d.ageGroup, existing);
  }

  for (const [age, vals] of byAge) {
    text += `\n${escapeHtml(age)}:\n`;
    text += `  👨 ${progressBar(vals.male)} ${vals.male.toFixed(1)}%\n`;
    text += `  👩 ${progressBar(vals.female)} ${vals.female.toFixed(1)}%\n`;
  }

  return text;
}

export function formatCountries(countries: CountryStats[]): string {
  if (!countries.length) return "❌ გეოგრაფიული მონაცემები არ არის.";

  let text = `🌍 <b>ქვეყნების განაწილება</b>\n━━━━━━━━━━━━━━━━━\n`;

  countries.slice(0, 15).forEach((c, i) => {
    text += `${i + 1}. ${escapeHtml(c.country)} — ${formatNumber(c.views)} (${c.percentage}%)\n`;
  });

  return text;
}

export function formatDevices(devices: DeviceStats[]): string {
  if (!devices.length) return "❌ მოწყობილობების მონაცემები არ არის.";

  let text = `📱 <b>მოწყობილობების განაწილება</b>\n━━━━━━━━━━━━━━━━━\n`;

  for (const d of devices) {
    text += `\n${escapeHtml(d.deviceType)}\n`;
    text += `${progressBar(d.percentage)} ${d.percentage}% (${formatNumber(d.views)})\n`;
  }

  return text;
}

export function formatRetention(points: RetentionPoint[], videoTitle: string): string {
  if (!points.length) return "❌ Retention მონაცემები ვერ მოიძებნა.";

  let text = `📈 <b>Audience Retention</b>\n🎬 ${escapeHtml(videoTitle)}\n━━━━━━━━━━━━━━━━━\n\n`;

  // Show key points: 0%, 25%, 50%, 75%, 100%
  const keyPoints = [0, 0.25, 0.5, 0.75, 1.0];
  for (const target of keyPoints) {
    const closest = points.reduce((prev, curr) =>
      Math.abs(curr.elapsedRatio - target) < Math.abs(prev.elapsedRatio - target) ? curr : prev
    );
    const pct = Math.round(closest.watchRatio * 100);
    text += `${Math.round(target * 100)}% ▸ ${progressBar(pct)} ${pct}%\n`;
  }

  return text;
}

export function formatTrends(trends: TrendComparison[]): string {
  if (!trends.length) return "❌ ტრენდის მონაცემები არ არის.";

  let text = `📈 <b>ზრდის ტრენდები</b> (წინა პერიოდთან შედარება)\n━━━━━━━━━━━━━━━━━\n`;

  for (const t of trends) {
    const arrow = t.direction === "up" ? "🟢" : t.direction === "down" ? "🔴" : "⚪";
    text += `\n${arrow} <b>${escapeHtml(t.metric)}</b>\n`;
    text += `   ${formatNumber(t.previous)} → ${formatNumber(t.current)} (${trendArrow(t.changePercent)})\n`;
  }

  return text;
}

export function formatReport(report: FullReport): string[] {
  const messages: string[] = [];

  // Section 1: Overview + Trends
  let section1 = `📋 <b>სრული ანგარიში</b> (${report.period === "weekly" ? "კვირის" : "თვის"})\n`;
  section1 += `📅 გენერირებულია: ${new Date(report.generatedAt).toLocaleString("ka-GE")}\n`;
  section1 += `━━━━━━━━━━━━━━━━━\n\n`;
  section1 += formatOverview(report.overview);
  messages.push(section1);

  // Section 2: Trends
  messages.push(formatTrends(report.trends));

  // Section 3: Top Videos
  messages.push(formatTopVideos(report.topVideos));

  // Section 4: Traffic
  let section4 = formatTrafficSources(report.traffic);
  if (report.searchTerms.length > 0) {
    section4 += `\n\n` + formatSearchTerms(report.searchTerms);
  }
  messages.push(section4);

  // Section 5: Audience
  let section5 = formatDemographics(report.demographics);
  section5 += `\n\n` + formatCountries(report.countries);
  messages.push(section5);

  return messages;
}
