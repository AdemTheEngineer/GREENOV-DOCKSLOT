import { env } from "./config/env";
import { logger } from "./lib/logger";
import { createApp } from "./app";

createApp().listen(env.PORT, () => logger.info(`DockSlot API listening on http://localhost:${env.PORT}`));
