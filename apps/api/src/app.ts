import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { createApiRouter } from "./routes";

export function createApp() {
  const app = express();
  // The Next.js proxy runs on the same host: trust it so rate limiting sees the real client IP.
  app.set("trust proxy", "loopback");
  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      // Never log headers: they carry the session cookie.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/v1", createApiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
