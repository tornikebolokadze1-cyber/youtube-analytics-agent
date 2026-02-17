import { Bot } from "grammy";
import { config } from "../config";
import { overviewCommand } from "./commands/overview";
import { videosCommand } from "./commands/videos";
import { audienceCommand } from "./commands/audience";
import { trafficCommand } from "./commands/traffic";
import { searchCommand } from "./commands/search";
import { trendsCommand } from "./commands/trends";
import { realtimeCommand } from "./commands/realtime";
import { reportCommand } from "./commands/report";
import { retentionCommand } from "./commands/retention";
import { helpCommand } from "./commands/help";
import { handleNaturalLanguage } from "./handlers/natural-language";

export function createBot(): Bot {
  const bot = new Bot(config.telegram.botToken);

  // Set command menu for Telegram autocomplete
  bot.api.setMyCommands([
    { command: "overview", description: "არხის მიმოხილვა" },
    { command: "videos", description: "ტოპ ვიდეოები" },
    { command: "audience", description: "აუდიტორიის დემოგრაფია" },
    { command: "traffic", description: "ტრაფიკის წყაროები" },
    { command: "search", description: "საძიებო ტერმინები" },
    { command: "trends", description: "ზრდის ტრენდები" },
    { command: "realtime", description: "რეალტაიმ მონაცემები" },
    { command: "report", description: "სრული ანგარიში" },
    { command: "retention", description: "აუდიტორიის შეკავება" },
    { command: "help", description: "ბრძანებების სია" },
  ]).catch(err => console.error("Failed to set bot commands:", err));

  // Auth middleware — only allow whitelisted users
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !config.telegram.allowedUsers.includes(userId)) {
      return; // Silently ignore unauthorized users
    }
    await next();
  });

  // Simple per-user rate limiter for bot commands
  const userCommandTimestamps = new Map<number, number[]>();
  const BOT_RATE_LIMIT = 5; // max commands per window
  const BOT_RATE_WINDOW = 60_000; // 1 minute

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const now = Date.now();
    const timestamps = userCommandTimestamps.get(userId) || [];
    const recent = timestamps.filter(t => now - t < BOT_RATE_WINDOW);

    if (recent.length >= BOT_RATE_LIMIT) {
      await ctx.reply("⏳ ძალიან ბევრი მოთხოვნა. გთხოვთ მოიცადოთ 1 წუთი.");
      return;
    }

    recent.push(now);
    userCommandTimestamps.set(userId, recent);
    await next();
  });

  // Commands
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🎬 <b>AI Pulse Analytics Bot</b>\n\nგამარჯობა! მე ვარ AI Pulse Georgia-ს ანალიტიკის ბოტი.\n\n` +
      `შემიძლია მოგაწოდოთ:\n` +
      `📊 არხის სრული მიმოხილვა\n` +
      `🔝 ტოპ ვიდეოების ანალიზი\n` +
      `👥 აუდიტორიის დემოგრაფია\n` +
      `🔍 ტრაფიკის წყაროები\n` +
      `📈 ზრდის ტრენდები\n` +
      `📋 სრული ანგარიშები\n\n` +
      `გამოიყენეთ /help ბრძანებების სანახავად.`,
      { parse_mode: "HTML" }
    );
  });

  bot.command("overview", overviewCommand);
  bot.command("videos", videosCommand);
  bot.command("audience", audienceCommand);
  bot.command("traffic", trafficCommand);
  bot.command("search", searchCommand);
  bot.command("trends", trendsCommand);
  bot.command("realtime", realtimeCommand);
  bot.command("report", reportCommand);
  bot.command("retention", retentionCommand);
  bot.command("help", helpCommand);

  // Natural language handler for free-text messages
  bot.on("message:text", handleNaturalLanguage);

  // Error handler
  bot.catch((err) => {
    console.error(`[${new Date().toISOString()}] Bot error:`, err.error || err.message);
  });

  return bot;
}
