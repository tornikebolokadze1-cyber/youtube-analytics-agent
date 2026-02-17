import type { Context } from "grammy";
import { getRetentionCurve } from "../../services/video-analytics";
import { getVideoDetails } from "../../api/data-api";
import { formatRetention } from "../formatters/telegram-format";

function extractVideoId(input: string): string | null {
  // Handle full YouTube URLs
  const urlPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function retentionCommand(ctx: Context): Promise<void> {
  try {
    const args = (ctx.message?.text || "").split(/\s+/).slice(1);
    const input = args.join(" ").trim();

    if (!input) {
      await ctx.reply(
        "📉 გამოიყენეთ: /retention <videoId ან URL>\n\nმაგ: /retention dQw4w9WgXcQ\nან: /retention https://youtube.com/watch?v=dQw4w9WgXcQ"
      );
      return;
    }

    const videoId = extractVideoId(input);
    if (!videoId) {
      await ctx.reply("❌ არასწორი ვიდეოს ID ან URL. სცადეთ 11-სიმბოლიანი ID ან სრული YouTube ლინკი.");
      return;
    }

    await ctx.reply("⏳ Retention მონაცემების ჩატვირთვა...");

    const [retention, videoInfo] = await Promise.all([
      getRetentionCurve(videoId),
      getVideoDetails([videoId]),
    ]);

    const title = videoInfo[0]?.title || videoId;
    await ctx.reply(formatRetention(retention, title), { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /retention:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
