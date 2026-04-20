import { app } from "electron";
import { APP_CONFIG, type AppEnvironment } from "../shared/appConfig";

export function getEnvironment(): AppEnvironment {
  return app.isPackaged ? "production" : "development";
}

export function getEnvConfig() {
  return APP_CONFIG.env[getEnvironment()];
}
