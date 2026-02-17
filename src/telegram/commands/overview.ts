import type { Context } from "grammy";
import { getOverview } from "../../services/channel-overview";
import { formatOverview } from "../formatters/telegram-format";

const PERIOD_MAP: Record<string, number> = {
  "7d": 7,
  "28d": 28,
  "90d": 90,
  "365d": 365,
};

export async function overviewCommand(ctx: Context): Promise<void> {
  try {
    const args = (ctx.message?.text || "").split(/\s+/).slice(1);
    const periodKey = args[0]?.toLowerCase() || "28d";
    const days = PERIOD_MAP[periodKey] || 28;

    await ctx.reply("⏳ მონაცემების ჩატვირთვა...");

    const data = await getOverview(days);
    await ctx.reply(formatOverview(data), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /overview:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
