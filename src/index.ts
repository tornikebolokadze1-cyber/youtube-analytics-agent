import { config } from "./config";
import { startAutoRefresh, stopAutoRefresh } from "./auth/token-manager";
import { createBot } from "./telegram/bot";
import { startDashboard, stopDashboard } from "./dashboard/server";

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting YouTube Analytics Agent...`);
  console.log(`[${new Date().toISOString()}] Channel: ${config.youtube.channelName}`);
  console.log(`[${new Date().toISOString()}] Environment: ${config.server.nodeEnv}`);

  // Start OAuth2 token auto-refresh (fail-fast: crashes if initial refresh fails)
  await startAutoRefresh();

  // Start dashboard server
  await startDashboard();

  // Start Telegram bot
  const bot = createBot();
  bot.start({
    onStart: () => {
      console.log(`[${new Date().toISOString()}] Telegram bot started (polling)`);
    },
  });

  console.log(`[${new Date().toISOString()}] All systems running!`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log(`\n[${new Date().toISOString()}] Shutting down...`);
    stopAutoRefresh();
    bot.stop();
    await stopDashboard();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] FATAL:`, err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, err);
});
