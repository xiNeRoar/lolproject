import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { createOgMiddleware } from "./lib/ogMiddleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

const STATIC_DIR = process.env.STATIC_DIR
  ?? join(__dirname, "..", "..", "vclol", "dist", "public");

const hasStaticFiles = existsSync(join(STATIC_DIR, "index.html"));

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "vclol-admin-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Rate limiting (Issue #28)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts." },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

// ── Static + OG serving (production) ─────────────────────────────────────────
if (hasStaticFiles) {
  // 1. OG tag injection — runs before static middleware so crawlers
  //    get enriched HTML for /matches/:id, /teams/:id, /players/:riotId
  app.use(createOgMiddleware(STATIC_DIR));

  // 2. Serve Vite build assets (JS, CSS, images, etc.)
  app.use(express.static(STATIC_DIR, { index: false }));

  // 3. SPA fallback — all non-API routes serve index.html
  app.get("/{*path}", (_req, res) => {
    res.sendFile(join(STATIC_DIR, "index.html"));
  });
} else if (isProduction) {
  console.warn(
    `[static] STATIC_DIR not found at ${STATIC_DIR}. ` +
    `Set STATIC_DIR env var or build the frontend first.`
  );
}

export default app;
