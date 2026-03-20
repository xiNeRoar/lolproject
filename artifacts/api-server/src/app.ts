import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

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
  windowMs: 60 * 1000,         // 1 minute
  max: 100,                    // 100 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1", // allow bot (same host)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // 20 auth requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts." },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

export default app;
