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
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.set("trust proxy", 1);

// Security
app.use(helmet());

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
  })
);

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
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
app.use((err: any, req: any, res: any, next: any) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
  });
});

export default app;
