import { z } from "zod";

// User-facing validation messages are in French in both apps.
z.config(z.locales.fr());

export * from "./constants";
export * from "./enums";
export * from "./schemas";
export * from "./dto";
