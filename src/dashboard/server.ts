import express from "express";
import path from "path";
import helmet from "helmet";
import { config } from "../config";
import { setupApiRoutes } from "./api-routes";
import { apiAuth, rateLimit, parseCookie } from "./middleware";

export function createDashboardServer(): express.Express {
  const app = express();

  // Security headers via helmet (CSP allows Chart.js CDN + Google Fonts + inline styles)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "https://i.ytimg.com", "https://yt3.ggpht.com", "data:"],
        connectSrc: ["'self'"],
      },
    },
  }));

  app.use(express.json({ limit: "16kb" }));

  const publicDir = path.join(__dirname, "public");

  // Auth endpoints (before static, before auth gate)
  app.post("/api/auth", (req, res) => {
    const token = config.server.dashboardApiToken;
    if (!token || req.body?.token === token) {
      if (token) {
        res.cookie("dashboard_token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: config.server.nodeEnv === "production",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/logout", (_req, res) => {
    res.clearCookie("dashboard_token");
    res.json({ ok: true });
  });

  // Gate root page — require auth, redirect to login if missing
  app.get("/", (req, res, next) => {
    const token = config.server.dashboardApiToken;
    if (!token) { next(); return; } // No auth configured (dev)
    const cookieToken = parseCookie(req.headers.cookie || "", "dashboard_token");
    if (cookieToken === token) { next(); return; }
    res.sendFile(path.join(publicDir, "login.html"));
  });

  // Serve static files (login.html, app.js, styles.css, etc.)
  app.use(express.static(publicDir));

  // Auth gate for API routes (skip /api/health)
  app.use("/api", (req, res, next) => {
    if (req.path === "/health") { next(); return; }
    apiAuth(req, res, next);
  });

  // Rate limiting: strict for AI endpoints, moderate for others
  app.use("/api/chat", rateLimit(10, 60 * 1000));       // 10 req/min
  app.use("/api/ui-suggest", rateLimit(10, 60 * 1000));  // 10 req/min
  app.use("/api", rateLimit(120, 60 * 1000));             // 120 req/min global

  // API routes
  setupApiRoutes(app);

  return app;
}

import type { Server } from "http";

let httpServer: Server | null = null;

export function startDashboard(): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = createDashboardServer();
    const port = config.server.port;
    httpServer = app.listen(port, () => {
      console.log(`[${new Date().toISOString()}] Dashboard running on port ${port}`);
      resolve();
    });
    httpServer.on("error", reject);
  });
}

export function stopDashboard(): Promise<void> {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}
