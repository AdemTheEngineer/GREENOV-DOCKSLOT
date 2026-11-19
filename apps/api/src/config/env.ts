import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
  })
  // The .env.example placeholder is public: a production token signed with it could be forged by anyone.
  .refine((env) => env.NODE_ENV !== "production" || (env.JWT_SECRET.length >= 32 && !env.JWT_SECRET.includes("change-me")), {
    message: "JWT_SECRET must be a unique random string of at least 32 characters in production.",
    path: ["JWT_SECRET"],
  });

export const parseEnv = (source: Record<string, string | undefined>) => envSchema.parse(source);

export const env = parseEnv(process.env);
export const isProduction = env.NODE_ENV === "production";
