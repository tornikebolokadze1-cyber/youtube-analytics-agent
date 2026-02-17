import type { Context } from "grammy";
import { generateFullReport } from "../../services/report-generator";
import { formatReport } from "../formatters/telegram-format";

export async function reportCommand(ctx: Context): Promise<void> {
  try {
    const args = (ctx.message?.text || "").split(/\s+/).slice(1);
    const type = args[0]?.toLowerCase() === "monthly" ? "monthly" : "weekly";

    await ctx.reply(`⏳ ${type === "weekly" ? "კვირის" : "თვის"} ანგარიშის გენერირება... (შეიძლება რამდენიმე წამი დასჭირდეს)`);

    const report = await generateFullReport(type as "weekly" | "monthly");
    const messages = formatReport(report);

    for (const msg of messages) {
      if (msg.length > 4096) {
        // Split long messages
        const chunks: string[] = [];
        let current = "";
        for (const line of msg.split("\n")) {
          if ((current + "\n" + line).length > 4000) {
            chunks.push(current);
            current = line;
          } else {
            current += (current ? "\n" : "") + line;
          }
        }
        if (current) chunks.push(current);
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: "HTML" });
        }
      } else {
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR /report:`, err);
    await ctx.reply("❌ ანგარიშის გენერირებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
