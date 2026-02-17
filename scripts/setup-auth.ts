/**
 * One-time local OAuth2 setup script.
 *
 * Run: npx tsx scripts/setup-auth.ts
 *
 * This will:
 * 1. Start a local Express server on port 8080
 * 2. Open browser to Google OAuth consent screen
 * 3. Receive the authorization code via callback
 * 4. Exchange code for refresh_token + access_token
 * 5. Print the refresh_token to console
 * 6. Stop the server
 *
 * Copy the refresh_token and add it to Railway Variables as GOOGLE_REFRESH_TOKEN.
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { execSync } from "child_process";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8080/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
  process.exit(1);
}

const app = express();

app.get("/callback", async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    res.send("Error: No authorization code received.");
    return;
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams({
      code,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.refresh_token) {
      console.log("\n========================================");
      console.log("SUCCESS! Your refresh token:");
      console.log("========================================");
      console.log(data.refresh_token);
      console.log("========================================");
      console.log("\nCopy this token and add it to Railway Variables as GOOGLE_REFRESH_TOKEN");
      console.log("Also add it to your .env file for local development.\n");

      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#0f0f23;color:#e2e8f0">
          <h1 style="color:#22c55e">Success!</h1>
          <p>Refresh token has been printed in the terminal.</p>
          <p>You can close this window.</p>
        </body></html>
      `);
    } else {
      console.error("ERROR: No refresh_token in response:", data);
      res.send("Error: No refresh_token received. See terminal for details.");
    }
  } catch (err) {
    console.error("ERROR exchanging code:", err);
    res.send("Error exchanging authorization code. See terminal for details.");
  }

  // Shut down after a brief delay
  setTimeout(() => process.exit(0), 2000);
});

const server = app.listen(8080, "127.0.0.1", () => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const url = authUrl.toString();

  console.log("\n========================================");
  console.log("OAuth2 Setup — YouTube Analytics");
  console.log("========================================");
  console.log("\nOpening browser for authorization...");
  console.log("If the browser doesn't open, visit this URL manually:\n");
  console.log(url);
  console.log("\n========================================\n");

  // Try to open browser
  try {
    const platform = process.platform;
    if (platform === "darwin") execSync(`open "${url}"`);
    else if (platform === "win32") execSync(`start "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {
    // Browser open failed — user will use URL manually
  }
});
