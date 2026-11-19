import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

// Prisma maps unique violations to P2002 but leaves exclusion and check violations
// unmapped, so we recover the raw Postgres SQLSTATE from the error message.
function postgresCode(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "23505";
  if (err instanceof Prisma.PrismaClientUnknownRequestError || err instanceof Prisma.PrismaClientKnownRequestError) {
    return /code: "([0-9A-Z]{5})"/.exec(err.message)?.[1];
  }
  return undefined;
}

function clientStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return new AppError(400, "VALIDATION_ERROR", "Les données envoyées sont invalides.", details);
  }
  switch (postgresCode(err)) {
    case "23P01":
      return new AppError(409, "SLOT_OVERLAP", "Ce créneau chevauche un créneau existant sur ce dock.");
    case "23505":
      return new AppError(409, "CONFLICT", "Cette opération entre en conflit avec une donnée existante.");
    case "23514":
      return new AppError(400, "VALIDATION_ERROR", "Les données envoyées sont invalides.");
  }
  const status = clientStatus(err);
  if (status === 413) return new AppError(413, "PAYLOAD_TOO_LARGE", "La requête est trop volumineuse.");
  if (status) return new AppError(status, "VALIDATION_ERROR", "Requête invalide.");
  return new AppError(500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);
  if (appError.status >= 500) req.log.error({ err }, "Unhandled error");
  const { code, message, details } = appError;
  res.status(appError.status).json({ error: details === undefined ? { code, message } : { code, message, details } });
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "Route introuvable."));
};
