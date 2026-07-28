import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  }
});

export function attachRequestId(req: Request, _res: Response, next: NextFunction) {
  req.requestId = String(req.id);
  next();
}
