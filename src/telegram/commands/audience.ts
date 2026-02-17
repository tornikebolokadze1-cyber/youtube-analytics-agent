import type { Context } from "grammy";
import { getDemographicBreakdown, getCountryBreakdown } from "../../services/audience-insights";
import { formatDemographics, formatCountries } from "../formatters/telegram-format";

export async function audienceCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply("⏳ აუდიტორიის მონაცემების ჩატვირთვა...");

    const [demographics, countries] = await Promise.all([
      getDemographicBreakdown(28),
      getCountryBreakdown(28),
    ]);

    await ctx.reply(formatDemographics(demographics), { parse_mode: "HTML" });
    await ctx.reply(formatCountries(countries), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /audience:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
