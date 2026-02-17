import type { Context } from "grammy";
import { getDailyTrend } from "../../services/trends";
import { formatNumber } from "../formatters/telegram-format";

export async function realtimeCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply("⏳ ბოლო 48 საათის მონაცემების ჩატვირთვა...");

    const data = await getDailyTrend(3); // Last 3 days to ensure we get 48h data

    if (!data.length) {
      await ctx.reply("❌ რეალტაიმ მონაცემები ამჟამად მიუწვდომელია.");
      return;
    }

    let text = `⏱ <b>ბოლო 48 საათის სტატისტიკა</b>\n━━━━━━━━━━━━━━━━━\n`;

    for (const day of data.slice(-2)) {
      text += `\n📅 <b>${day.date}</b>\n`;
      text += `   👁 ნახვები: ${formatNumber(day.views)}\n`;
      text += `   ⏱ ყურების დრო: ${day.watchTimeHours} სთ\n`;
      text += `   👥 გამომწერები: +${day.subscribersGained}\n`;
      text += `   👍 მოწონებები: ${formatNumber(day.likes)}\n`;
    }

    // Comparison
    if (data.length >= 2) {
      const today = data[data.length - 1];
      const yesterday = data[data.length - 2];
      const viewChange = yesterday.views > 0
        ? Math.round(((today.views - yesterday.views) / yesterday.views) * 100)
        : 0;

      text += `\n📊 <b>ცვლილება:</b> ${viewChange >= 0 ? "↑" : "↓"} ${Math.abs(viewChange)}% ნახვებში`;
    }

    await ctx.reply(text, { parse_mode: "HTML" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /realtime:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
