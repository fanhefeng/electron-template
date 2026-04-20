import { app } from "electron";
import { MainApp } from "./MainApp";
import { logger } from "./services/logger-service";
import { deepLinkService } from "./services/deep-link-service";

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
      // 无 deep link 时聚焦主窗口
      const windowManager = mainApp.getWindowManager();
      const mainWin = windowManager.getBrowserWindow("main");
      if (mainWin && !mainWin.isDestroyed()) {
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
