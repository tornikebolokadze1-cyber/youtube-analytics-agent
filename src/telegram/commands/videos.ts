import type { Context } from "grammy";
import { getTopVideosList } from "../../services/video-analytics";
import { formatTopVideos } from "../formatters/telegram-format";

export async function videosCommand(ctx: Context): Promise<void> {
  try {
    const args = (ctx.message?.text || "").split(/\s+/).slice(1);
    const count = Math.min(Math.max(parseInt(args[0] || "10", 10) || 10, 1), 20);

    await ctx.reply("⏳ ტოპ ვიდეოების ჩატვირთვა...");

    const data = await getTopVideosList(28, count);
    await ctx.reply(formatTopVideos(data), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /videos:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
