import type { Context } from "grammy";
import { getTopSearchTerms } from "../../services/traffic-analysis";
import { formatSearchTerms } from "../formatters/telegram-format";

export async function searchCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply("⏳ საძიებო ტერმინების ჩატვირთვა...");

    const data = await getTopSearchTerms(28, 25);
    await ctx.reply(formatSearchTerms(data), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /search:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
