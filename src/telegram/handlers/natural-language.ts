import type { Context } from "grammy";
import { chatWithGemini } from "../../ai/orchestrator";

const TG_MAX_LENGTH = 4096;

/** Split a long message into Telegram-safe chunks, breaking at newlines */
function splitMessage(text: string): string[] {
  if (text.length <= TG_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= TG_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (newline) within the limit
    let breakAt = remaining.lastIndexOf("\n", TG_MAX_LENGTH);
    if (breakAt < TG_MAX_LENGTH * 0.3) {
      // No good newline found — break at space
      breakAt = remaining.lastIndexOf(" ", TG_MAX_LENGTH);
    }
    if (breakAt <= 0) breakAt = TG_MAX_LENGTH;

    chunks.push(remaining.substring(0, breakAt));
    remaining = remaining.substring(breakAt).trimStart();
  }

  return chunks;
}

export async function handleNaturalLanguage(ctx: Context): Promise<void> {
  const text = (ctx.message?.text || "").trim();
  if (!text) return;

  try {
    await ctx.replyWithChatAction("typing");

    const reply = await chatWithGemini(text);

    // Split long replies into Telegram-safe chunks
    const chunks = splitMessage(reply);
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR in NL handler:`, err);
    await ctx.reply("❌ მონაცემების მიღებისას შეცდომა მოხდა. სცადეთ მოგვიანებით.");
  }
}
