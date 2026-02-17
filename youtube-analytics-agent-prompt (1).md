# Claude Code Prompt: YouTube Analytics Agent

> ეს პრომპტი ჩასვი Claude Code გაფართოებაში VS Code-ში. Claude Code აგიწყობს სრულ YouTube Analytics აგენტს Telegram ბოტითა და Web Dashboard-ით.

---

## პრომპტი

```
Build a complete YouTube Analytics Agent project with two interfaces: a Telegram bot and a real-time web dashboard. This is a full-stack project that uses the YouTube Analytics API v2 and YouTube Data API v3 to provide deep, comprehensive channel analytics.

## Project Structure

Create the project at ~/youtube-analytics-agent/ with this structure:

youtube-analytics-agent/
├── .env                          # All credentials and config (local only, NOT committed)
├── .gitignore                    # Ignore node_modules, dist, .env, tokens.json
├── Dockerfile                    # For Railway deployment
├── railway.toml                  # Railway config
├── package.json                  # Node.js dependencies
├── tsconfig.json
├── src/
│   ├── config/
│   │   └── index.ts              # Environment config loader
│   ├── auth/
│   │   └── token-manager.ts      # OAuth2 token management (in-memory, refresh from env var)
│   ├── api/
│   │   ├── analytics.ts          # YouTube Analytics API v2 client
│   │   ├── data-api.ts           # YouTube Data API v3 client (videos, channel info)
│   │   └── types.ts              # TypeScript interfaces for all API responses
│   ├── services/
│   │   ├── channel-overview.ts   # Aggregated channel stats service
│   │   ├── video-analytics.ts    # Per-video deep analytics
│   │   ├── audience-insights.ts  # Demographics, geography, devices
│   │   ├── traffic-analysis.ts   # Traffic sources, search terms
│   │   ├── trends.ts             # Period comparison, growth trends
│   │   └── report-generator.ts   # Generate formatted reports (text + charts data)
│   ├── telegram/
│   │   ├── bot.ts                # Telegram bot setup (grammy)
│   │   ├── commands/
│   │   │   ├── overview.ts       # /overview - full channel overview
│   │   │   ├── videos.ts         # /videos - top videos analysis
│   │   │   ├── audience.ts       # /audience - demographics & geography
│   │   │   ├── traffic.ts        # /traffic - traffic sources
│   │   │   ├── trends.ts         # /trends - growth trends & comparisons
│   │   │   ├── realtime.ts       # /realtime - last 48h real-time data
│   │   │   ├── report.ts         # /report - generate full weekly/monthly report
│   │   │   └── help.ts           # /help - command reference
│   │   ├── handlers/
│   │   │   └── natural-language.ts  # Handle free-text questions about analytics
│   │   └── formatters/
│   │       └── telegram-format.ts   # Format data with emojis, tables for Telegram
│   ├── dashboard/
│   │   ├── server.ts             # Express server for dashboard
│   │   ├── api-routes.ts         # REST API endpoints for dashboard
│   │   └── public/
│   │       ├── index.html        # Single-page dashboard app
│   │       ├── styles.css         # Modern, trendy CSS (dark theme)
│   │       └── app.js            # Frontend JavaScript (Chart.js, interactive)
│   └── index.ts                  # Main entry point (starts both bot + dashboard)
├── scripts/
│   └── setup-auth.ts             # One-time local OAuth setup (run locally, NOT on Railway)

## Critical Configuration

### .env file contents:
```
# YouTube Channel
YOUTUBE_CHANNEL_ID=UColvhLQFpqDvoKejP0a5rVw
YOUTUBE_CHANNEL_NAME=AI Pulse Georgia

# Google OAuth2 (EXISTING credentials - do NOT create new ones)
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=http://localhost:8080/callback
GOOGLE_REFRESH_TOKEN=<will be obtained from local OAuth setup script>

# OAuth Scopes
YOUTUBE_SCOPES=https://www.googleapis.com/auth/yt-analytics.readonly,https://www.googleapis.com/auth/yt-analytics-monetary.readonly,https://www.googleapis.com/auth/youtube.readonly

# Telegram Bot
TELEGRAM_BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
TELEGRAM_ALLOWED_USERS=6167885472

# Dashboard
PORT=3000
NODE_ENV=production
```

### Token Management (CRITICAL for Railway):
Railway has NO persistent filesystem. The token-manager.ts must:
- Read GOOGLE_REFRESH_TOKEN from environment variable (not from file)
- Store access_token in memory only (a simple variable)
- Auto-refresh access_token before it expires (every ~55 minutes)
- Never read/write tokens.json — everything stays in memory + env vars

## YouTube Analytics API v2 — Metrics Reference

### Implement ALL of these query functions in analytics.ts:

1. **Channel Overview** (last 28/90/365 days):
   - metrics: views, estimatedMinutesWatched, averageViewDuration, subscribersGained, subscribersLost, likes, comments, shares
   - NO dimensions (totals only)

2. **Daily Metrics** (time series for charts):
   - metrics: views, estimatedMinutesWatched, averageViewDuration, subscribersGained, likes
   - dimensions: day
   - sort: day

3. **Top Videos** (by views, watch time, or engagement):
   - metrics: views, estimatedMinutesWatched, averageViewDuration, likes, comments, shares
   - dimensions: video
   - sort: -views (or -estimatedMinutesWatched)
   - maxResults: 20

4. **Traffic Sources**:
   - metrics: views, estimatedMinutesWatched
   - dimensions: insightTrafficSourceType
   - sort: -views

5. **Search Terms** (what people search to find the channel):
   - metrics: views, estimatedMinutesWatched
   - dimensions: insightTrafficSourceDetail
   - filters: insightTrafficSourceType==YT_SEARCH
   - sort: -views
   - maxResults: 25

6. **Demographics** (age + gender):
   - metrics: viewerPercentage
   - dimensions: ageGroup,gender

7. **Geography** (country breakdown):
   - metrics: views, estimatedMinutesWatched
   - dimensions: country
   - sort: -views

8. **Device Types**:
   - metrics: views, estimatedMinutesWatched
   - dimensions: deviceType

9. **Operating Systems**:
   - metrics: views, estimatedMinutesWatched
   - dimensions: operatingSystem

10. **Video Retention** (audience retention per video):
    - metrics: audienceWatchRatio
    - dimensions: elapsedVideoTimeRatio
    - filters: video==VIDEO_ID

11. **Subscribers by Source**:
    - metrics: subscribersGained, subscribersLost
    - dimensions: subscribedStatus
    
12. **Playback Location**:
    - metrics: views, estimatedMinutesWatched
    - dimensions: insightPlaybackLocationType

### IMPORTANT API NOTES:
- Base URL: https://youtubeanalytics.googleapis.com/v2/reports
- Always include: ids=channel==UColvhLQFpqDvoKejP0a5rVw
- Date format: YYYY-MM-DD
- DO NOT use estimatedRevenue metric (requires YouTube Partner Program monetization approval)
- DO NOT use averageViewPercentage in channel-level queries (only works with video filter)
- Handle 403 errors gracefully — some metrics may not be available

## Telegram Bot — Commands & Features

### Commands:
- /start — Welcome message with feature overview
- /overview [period] — Channel overview (default: 28 days, options: 7d, 28d, 90d, 365d)
- /videos [count] — Top videos ranked by views (default: 10)
- /audience — Demographics breakdown (age, gender, country)
- /traffic — Traffic sources analysis
- /search — Top search terms bringing viewers
- /trends — Compare this period vs previous (growth %)
- /realtime — Last 48 hours real-time stats
- /report [weekly|monthly] — Generate comprehensive report
- /retention [video_url_or_id] — Audience retention for specific video
- /help — All commands with descriptions

### Natural Language Handler:
The bot should also respond to free-text questions in BOTH English and Georgian, like:
- "რამდენი ნახვა მქონდა ბოლო თვეში?" → calls channel overview
- "საიდან მოდის ტრაფიკი?" → calls traffic sources
- "ტოპ ვიდეოები მაჩვენე" → calls top videos
- "How is my channel growing?" → calls trends
- "Demographics?" → calls audience insights

Use keyword matching (not AI/LLM) to route questions to the right analytics function.

### Telegram Message Formatting:
- Use emojis for visual hierarchy (📊 📈 👥 🔝 🌍 📱 🔍)
- Format tables with monospace code blocks
- Show percentages with visual bars: ██████░░░░ 60%
- Add trend arrows: ↑ 12.5% or ↓ 3.2%
- For reports, send multiple messages (split by section) if too long
- Include period dates in every response
- Georgian language support for responses when user writes in Georgian

## Web Dashboard — Design Requirements

### Overall Design Philosophy:
- Dark theme (primary: #0f0f23, secondary: #1a1a3e, accent: #6366f1)
- Modern glassmorphism effects (backdrop-filter: blur)
- Smooth animations on data load
- Fully responsive (mobile-first)
- Single HTML file with embedded CSS/JS (for simplicity)
- Use Chart.js for all charts (import from CDN)
- Auto-refresh data every 5 minutes
- Clean, minimal, data-dense layout inspired by YouTube Studio

### Dashboard Sections (top to bottom):

**1. Header Bar**
- Channel name + logo placeholder
- Current date/time
- Period selector dropdown (7d, 28d, 90d, 365d)
- Auto-refresh indicator (pulsing dot)
- Last updated timestamp

**2. KPI Cards Row** (4 cards in a row):
- Total Views (with trend % vs previous period)
- Watch Time in Hours (with trend %)
- Subscribers Gained (net, with trend %)
- Avg View Duration (formatted as mm:ss, with trend %)
Each card: large number, small label, trend badge (green ↑ / red ↓)

**3. Views & Watch Time Chart** (large area chart):
- Dual Y-axis: views (left), watch time hours (right)
- Daily data points
- Tooltips on hover
- Gradient fill under the line

**4. Two-Column Layout:**

Left Column:
- **Top Videos Table** — Rank, thumbnail placeholder, title (truncated), views, watch time, likes, engagement rate
- Sortable by clicking column headers
- Hover effect on rows

Right Column:
- **Traffic Sources** — Horizontal bar chart with source names and percentages
- **Search Terms** — Tag cloud or simple list with view counts

**5. Audience Section** (two charts side by side):
- **Demographics** — Stacked bar chart (age groups × gender)
- **Geography** — Horizontal bar chart (top 10 countries)

**6. Device & Platform** (two small charts):
- **Device Types** — Donut chart (mobile, desktop, tablet, TV)
- **Operating Systems** — Donut chart (Android, iOS, Windows, etc.)

**7. Footer**
- "Powered by YouTube Analytics API"
- Data refresh button
- Channel link

### Dashboard API Endpoints (Express routes):

```
GET /api/overview?period=28        → KPI data + trends
GET /api/daily?period=28           → Daily time series for charts
GET /api/videos?limit=20&sort=views → Top videos
GET /api/traffic                    → Traffic sources
GET /api/search-terms               → Search terms
GET /api/demographics               → Age + gender
GET /api/geography                  → Country breakdown
GET /api/devices                    → Device types + OS
GET /api/retention/:videoId         → Video retention curve
```

### Chart.js Configuration Notes:
- Use Chart.js v4+ from CDN
- Dark theme: grid lines #2a2a4a, text #a0a0b0
- Gradient fills: use canvas gradient objects
- Animations: tension 0.4 for smooth curves
- Responsive: maintainAspectRatio: false
- Custom tooltip styling matching dark theme

## Technical Requirements

### Node.js/TypeScript Setup:
- TypeScript with strict mode
- Use tsx for running TypeScript directly
- Express for dashboard server
- grammy or node-telegram-bot-api for Telegram
- chart.js (CDN in HTML, not npm)
- dotenv for environment variables
- node-cron for scheduled tasks (optional: periodic data cache)

### Error Handling:
- Graceful token refresh (auto-refresh before expiry)
- Retry logic for API calls (3 retries with exponential backoff)
- Meaningful error messages in Telegram (not raw errors)
- Dashboard shows "Loading..." states, not crashes
- Log errors to console with timestamps

### Security:
- Telegram bot only responds to TELEGRAM_ALLOWED_USERS
- Dashboard has basic auth or token-based access
- .env file in .gitignore
- No hardcoded credentials anywhere

## Deployment — Railway

This project will be deployed on Railway. Create all files needed for Railway deployment:

### Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### railway.toml:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### .gitignore:
```
node_modules/
dist/
.env
tokens.json
*.log
```

### package.json scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  }
}
```

## Build & Run Instructions

### Local development:
1. npm install
2. npm run dev
   (Starts BOTH Telegram bot AND dashboard on port 3000)

### Railway deployment:
1. Initialize git repo:
   git init && git add . && git commit -m "initial commit"

2. Create GitHub repo and push:
   gh repo create youtube-analytics-agent --private --push --source=.
   (Or manually create on github.com and push)

3. On Railway dashboard (railway.app):
   - Create NEW project (not heartfelt-bravery — that's the literature bot)
   - "Deploy from GitHub Repo" → select youtube-analytics-agent
   - Add ALL environment variables from .env in Railway Variables tab
   - Add one extra variable: GOOGLE_REFRESH_TOKEN (obtained from local OAuth setup — see below)

4. Railway will auto-deploy on every git push

### Environment Variables for Railway:
All .env variables must be added in Railway's Variables tab:
- YOUTUBE_CHANNEL_ID
- GOOGLE_CLIENT_ID  
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GOOGLE_REFRESH_TOKEN (obtained from local OAuth setup script)
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ALLOWED_USERS
- DASHBOARD_PORT=3000
- PORT=3000 (Railway uses this)
- NODE_ENV=production

### Token Management for Railway:
Since Railway doesn't have persistent filesystem, modify token-manager.ts to:
1. On startup: use GOOGLE_REFRESH_TOKEN env var to get initial access_token
2. Keep access_token in memory (not file)
3. Auto-refresh before expiry (tokens last ~1 hour)
4. NO tokens.json file needed — everything via env vars

## IMPORTANT CONSTRAINTS:
- This deploys on Railway — no filesystem persistence
- Token management must be in-memory with env var for refresh_token
- The Google Cloud project (ID: 775322348812) already has YouTube Analytics API and YouTube Data API v3 enabled
- OAuth refresh_token is obtained via local setup script (scripts/setup-auth.ts) and stored in Railway env vars
- The setup script only needs to run ONCE locally — after that, refresh_token is used from env var
- Channel ID is UColvhLQFpqDvoKejP0a5rVw (AI Pulse Georgia)
- Never use estimatedRevenue or averageViewPercentage in channel-level queries
- Dashboard runs on PORT env var (Railway assigns this dynamically)
- Use process.env.PORT || 3000 for the Express server port
- Railway account: tornikebolokadze1@gmail.com
```

---

## დამატებითი შენიშვნები

### Telegram Bot Token
ბოტი უკვე შექმნილია: **AI Pulse Analytics**
ტოკენი უკვე ჩადებულია პრომპტში.

### Railway Deployment
Railway-ზე ახალი პროექტი შექმენი (არა heartfelt-bravery-ში — ეგ literature bot-ისთვისაა).

**OAuth Refresh Token-ის მიღება (ერთჯერადი ლოკალური setup):**
პროექტში შექმენი `scripts/setup-auth.ts` — ლოკალური OAuth flow:
1. გაუშვი: `npx tsx scripts/setup-auth.ts`
2. ბრაუზერში გაიხსნება Google OAuth consent screen
3. შედი **tornikebolokadze1@gmail.com** ანგარიშით
4. დაეთანხმე scopes-ს
5. სკრიპტი დაბეჭდავს refresh_token-ს კონსოლში
6. ეგ refresh_token ჩასვი Railway Variables-ში `GOOGLE_REFRESH_TOKEN` სახელით

setup-auth.ts სკრიპტმა უნდა:
- გაუშვას ლოკალური Express სერვერი port 8080-ზე callback-ისთვის
- გახსნას ბრაუზერი OAuth URL-ით (scope: yt-analytics.readonly, yt-analytics-monetary.readonly, youtube.readonly)
- მიიღოს authorization code callback-ით
- გაცვალოს code → refresh_token + access_token
- დაბეჭდოს refresh_token კონსოლში
- დაიხუროს სერვერი

### Dashboard წვდომა
Railway ავტომატურად მისცემს public URL-ს dashboard-ს (მაგ: `youtube-analytics-agent-production.up.railway.app`). Telegram ბოტი ავტომატურად გაეშვება polling-ით.
