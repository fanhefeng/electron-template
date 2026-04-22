import { app } from "electron";
import { MainApp } from "./MainApp";
import { logger } from "./services/logger-service";
import { deepLinkService } from "./services/deep-link-service";
import { getEnvConfig } from "./environment";

// 在所有 app.getPath() 调用之前设置 app name，实现开发/生产数据路径隔离
app.setName(getEnvConfig().appName);
// 重新配置日志路径，确保使用隔离后的 app name（import 阶段的日志已写入旧路径）
logger.reconfigure();

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason);
});

const mainApp = new MainApp();

// 单实例锁 — 确保只有一个 app 实例运行
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  // Windows/Linux: 第二个实例启动时，deep link URL 在 argv 中
  app.on("second-instance", (_event, argv) => {
    const url = deepLinkService.extractFromArgv(argv);
    if (url) {
      deepLinkService.handle(deepLinkService.parse(url));
    } else {
      // 无 deep link 时显示并聚焦主窗口（可能被隐藏到托盘）
      const windowManager = mainApp.getWindowManager();
      const mainWin = windowManager.getBrowserWindow("main");
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.show();
        if (mainWin.isMinimized()) mainWin.restore();
        mainWin.focus();
      }
    }
  });

  // macOS: app 已运行时，通过 open-url 接收 deep link
  app.on("open-url", (event, url) => {
    event.preventDefault();
    deepLinkService.handle(deepLinkService.parse(url));
  });

  mainApp
    .init()
    .then(() => {
      logger.info("Application initialized");

      // 冷启动时检查 argv 中是否有 deep link（Windows/Linux）
      if (process.platform !== "darwin") {
        const url = deepLinkService.extractFromArgv(process.argv);
        if (url) {
          deepLinkService.handle(deepLinkService.parse(url));
        }
      }
    })
    .catch((error) => {
      logger.error("Failed to initialize application", error);
      process.exit(1);
    });
}
