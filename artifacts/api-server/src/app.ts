import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";

// ESM-compatible __dirname (not available natively in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import router from "./routes";
import { createOgMiddleware } from "./lib/ogMiddleware";

const app: Express = express();
const PgStore = pgSession(session);

const isProduction = process.env.NODE_ENV === "production";

// ── Static SPA serving ────────────────────────────────────────────────────────
// In production the Vite build output is mounted at STATIC_DIR.
// Express serves static assets AND injects OG tags for social link previews.
// In development this path typically won't exist — Vite dev server handles it.

const STATIC_DIR = process.env.STATIC_DIR
  ?? join(__dirname, "..", "..", "vclol", "dist", "public");

const hasStaticFiles = existsSync(join(STATIC_DIR, "index.html"));

// ── Middleware ────────────────────────────────────────────────────────────────

const PLATFORM_URL = (process.env.PLATFORM_URL || "http://localhost:5173").replace(/\/+$/, "");

const allowedOrigins = [
  PLATFORM_URL,
  ...(!isProduction ? ["http://localhost:5173", "http://localhost:3000"] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (!isProduction) console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DEFAULT_SECRET = "vclol-admin-secret-2024";
const sessionSecret = process.env.SESSION_SECRET || DEFAULT_SECRET;

if (isProduction && sessionSecret === DEFAULT_SECRET) {
  console.error(
    "[FATAL] SESSION_SECRET is using the default dev value in production. " +
    "Set SESSION_SECRET to a cryptographically random string. " +
    "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  process.exit(1);
}

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
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
