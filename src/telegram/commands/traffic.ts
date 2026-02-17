import type { Context } from "grammy";
import { getTrafficSourceBreakdown } from "../../services/traffic-analysis";
import { formatTrafficSources } from "../formatters/telegram-format";

export async function trafficCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply("⏳ ტრაფიკის წყაროების ჩატვირთვა...");

    const data = await getTrafficSourceBreakdown(28);
    await ctx.reply(formatTrafficSources(data), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /traffic:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
