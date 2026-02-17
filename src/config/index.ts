import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  youtube: {
    channelId: required("YOUTUBE_CHANNEL_ID"),
    channelName: process.env.YOUTUBE_CHANNEL_NAME || "YouTube Channel",
  },
  google: {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:8080/callback",
    refreshToken: required("GOOGLE_REFRESH_TOKEN"),
  },
  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    allowedUsers: (process.env.TELEGRAM_ALLOWED_USERS || "")
      .split(",")
      .map(Number)
      .filter(Boolean),
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-3-pro-preview",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
    kimiModel: process.env.KIMI_MODEL || "moonshotai/kimi-k2",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    dashboardApiToken: (process.env.NODE_ENV || "development") === "production"
      ? required("DASHBOARD_API_TOKEN")
      : process.env.DASHBOARD_API_TOKEN || "",
  },
};
