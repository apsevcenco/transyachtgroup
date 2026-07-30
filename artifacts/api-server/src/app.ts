import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import router from "./routes";
import { logger } from "./lib/logger";

dotenv.config();

const app: Express = express();

app.set("trust proxy", 1);

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(limiter);

// Logger
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    const forwardedHost = req.header("X-Forwarded-Host");
    const requestHost = forwardedHost || req.header("Host");
    let sameOrigin = false;
    if (origin && requestHost) {
      try {
        sameOrigin = new URL(origin).host === requestHost;
      } catch {
        sameOrigin = false;
      }
    }
    const originAllowed =
      !origin ||
      process.env.NODE_ENV !== "production" ||
      sameOrigin ||
      allowedOrigins.has(origin);
    callback(null, {
      origin: originAllowed,
      credentials: false,
    });
  }),
);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use("/api", router);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err: any, req: any, res: any, _next: any) => {
  const requestId = req.id || req.headers?.["x-request-id"];
  logger.error({ err, requestId }, "Unhandled API error");
  res.status(err.status || 500).json({
    error:
      err.status && err.status < 500 ? err.message : "Internal Server Error",
    requestId,
  });
});

export default app;
