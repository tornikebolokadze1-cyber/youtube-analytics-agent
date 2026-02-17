import { askClaude } from "./claude";
import { askGemini } from "./gemini";
import { askKimiForUI, type UIRecommendation } from "./kimi";
import { getOverview } from "../services/channel-overview";
import { getTopVideosList } from "../services/video-analytics";
import { getTrafficSourceBreakdown, getTopSearchTerms } from "../services/traffic-analysis";
import { getDemographicBreakdown, getCountryBreakdown } from "../services/audience-insights";
import { getPeriodComparison, getDailyTrend } from "../services/trends";

/**
 * Multi-model orchestrator:
 *   Claude  = main analytical brain (analyzes data, decides response in English)
 *   Gemini  = Georgian language writer (rewrites Claude's analysis beautifully in Georgian)
 *   Kimi    = UI/UX design recommendations
 */

async function gatherAnalyticsContext(): Promise<string> {
  try {
    const [overview, videos, traffic, trends, daily, demographics, countries, searchTerms] = await Promise.all([
      getOverview(28).catch(() => null),
      getTopVideosList(28, 10).catch(() => null),
      getTrafficSourceBreakdown(28).catch(() => null),
      getPeriodComparison(28).catch(() => null),
      getDailyTrend(365).catch(() => null),
      getDemographicBreakdown(28).catch(() => null),
      getCountryBreakdown(28).catch(() => null),
      getTopSearchTerms(28, 15).catch(() => null),
    ]);

    const parts: string[] = [];

    if (overview) {
      parts.push(`📊 არხის მიმოხილვა (${overview.period}, ${overview.startDate} — ${overview.endDate}):
- ნახვები: ${overview.views.toLocaleString()}
- ყურების დრო: ${overview.watchTimeHours} საათი (${overview.estimatedMinutesWatched} წუთი)
- საშუალო ყურების ხანგრძლივობა: ${overview.averageViewDuration} წამი (${Math.floor(overview.averageViewDuration / 60)}:${String(Math.floor(overview.averageViewDuration % 60)).padStart(2, "0")})
- გამომწერები მოპოვებული: +${overview.subscribersGained}
- გამომწერები დაკარგული: -${overview.subscribersLost}
- წმინდა გამომწერები: ${overview.netSubscribers >= 0 ? "+" : ""}${overview.netSubscribers}
- მოწონებები: ${overview.likes}
- კომენტარები: ${overview.comments}
- გაზიარებები: ${overview.shares || 0}`);
    }

    if (videos?.length) {
      parts.push(`🔝 ტოპ ${videos.length} ვიდეო (28 დღე):
${videos.map((v, i) => `${i + 1}. "${v.title}"
   ნახვები: ${v.views.toLocaleString()} | ყურების დრო: ${v.watchTimeHours}სთ | მოწონება: ${v.likes} | ჩართულობა: ${v.engagementRate}%`).join("\n")}`);
    }

    if (traffic?.length) {
      parts.push(`🔍 ტრაფიკის წყაროები:
${traffic.map((t) => `- ${t.source}: ${t.views.toLocaleString()} ნახვა (${t.percentage}%)`).join("\n")}`);
    }

    if (trends?.length) {
      parts.push(`📈 ზრდის ტრენდები (წინა 28 დღესთან შედარება):
${trends.map((t) => `- ${t.metric}: მიმდინარე=${t.current}, წინა=${t.previous}, ცვლილება=${t.changePercent}% (${t.direction === "up" ? "ზრდა" : t.direction === "down" ? "კლება" : "სტაბილური"})`).join("\n")}`);
    }

    if (daily?.length) {
      // Group daily data by month for historical view
      const byMonth = new Map<string, { views: number; watchHours: number; subs: number; likes: number; days: number }>();
      for (const d of daily) {
        const monthKey = d.date.substring(0, 7); // YYYY-MM
        const entry = byMonth.get(monthKey) || { views: 0, watchHours: 0, subs: 0, likes: 0, days: 0 };
        entry.views += d.views;
        entry.watchHours += d.watchTimeHours;
        entry.subs += d.subscribersGained;
        entry.likes += d.likes;
        entry.days += 1;
        byMonth.set(monthKey, entry);
      }

      parts.push(`📅 თვიური მონაცემები (${daily.length} დღე, ${daily[0]?.date} — ${daily[daily.length - 1]?.date}):
${[...byMonth.entries()].map(([month, m]) => `${month}: ნახვები=${m.views.toLocaleString()}, ყურების დრო=${m.watchHours.toFixed(1)}სთ, გამომწერები=+${m.subs}, მოწონება=${m.likes}, დღეები=${m.days}`).join("\n")}`);

      // Also include last 7 days detail
      const last7 = daily.slice(-7);
      if (last7.length) {
        parts.push(`📆 ბოლო 7 დღე (დეტალური):
${last7.map((d) => `${d.date}: ნახვები=${d.views}, ყურება=${d.watchTimeHours}სთ, გამომწერი=+${d.subscribersGained}`).join("\n")}`);
      }
    }

    if (demographics?.length) {
      const byAge = new Map<string, { male: number; female: number }>();
      for (const d of demographics) {
        const e = byAge.get(d.ageGroup) || { male: 0, female: 0 };
        if (d.gender === "male") e.male = d.viewerPercentage; else e.female = d.viewerPercentage;
        byAge.set(d.ageGroup, e);
      }
      parts.push(`👥 აუდიტორიის დემოგრაფია:
${[...byAge.entries()].map(([age, v]) => `${age}: მამრ=${v.male.toFixed(1)}%, მდედრ=${v.female.toFixed(1)}%`).join("\n")}`);
    }

    if (countries?.length) {
      parts.push(`🌍 ტოპ ქვეყნები:
${countries.slice(0, 10).map((c, i) => `${i + 1}. ${c.country}: ${c.views.toLocaleString()} ნახვა (${c.percentage}%)`).join("\n")}`);
    }

    if (searchTerms?.length) {
      parts.push(`🔎 ტოპ საძიებო ტერმინები:
${searchTerms.slice(0, 10).map((t, i) => `${i + 1}. "${t.term}" — ${t.views.toLocaleString()} ნახვა`).join("\n")}`);
    }

    return parts.join("\n\n");
  } catch (err) {
    console.error("[Orchestrator] Failed to gather context:", err);
    return "";
  }
}

export async function chatWithGemini(userMessage: string): Promise<string> {
  const context = await gatherAnalyticsContext();

  // Step 1: Claude analyzes the data and produces English insights
  const claudeAnalysis = await askClaude(userMessage, context);

  if (claudeAnalysis) {
    // Step 2: Gemini rewrites Claude's analysis beautifully in Georgian
    console.log("[Orchestrator] Claude analyzed, sending to Gemini for Georgian rewriting");
    const geminiPrompt = `Claude-მა გააანალიზა YouTube მონაცემები და შემდეგი ანალიზი მოამზადა. გადაწერე ეს ანალიზი ქართულად, ლამაზად და პროფესიონალურად. შეინარჩუნე ყველა ციფრი, ინსაითი და რეკომენდაცია. არ დაამატო ახალი ანალიზი — მხოლოდ ქართულად გადმოეცი:\n\n${claudeAnalysis}`;
    return askGemini(geminiPrompt, "");
  }

  // Fallback: if Claude fails, Gemini does everything (old behavior)
  console.warn("[Orchestrator] Claude unavailable, falling back to Gemini-only mode");
  return askGemini(userMessage, context);
}

export async function getUIRecommendation(request: string): Promise<UIRecommendation> {
  return askKimiForUI(request);
}
