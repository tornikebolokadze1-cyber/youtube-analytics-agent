import type { Context } from "grammy";
import { getPeriodComparison } from "../../services/trends";
import { formatTrends } from "../formatters/telegram-format";

export async function trendsCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply("⏳ ტრენდების ანალიზი...");

    const data = await getPeriodComparison(28);
    await ctx.reply(formatTrends(data), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /trends:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
