export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (message = "Ressource introuvable.") => new AppError(404, "NOT_FOUND", message);
export const unauthenticated = (message = "Authentification requise.") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const forbidden = () => new AppError(403, "FORBIDDEN", "Accès refusé.");
