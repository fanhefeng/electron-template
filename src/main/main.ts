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
    const payload = url ? deepLinkService.parse(url) : null;
    if (payload) {
      // deepLinkService queues the payload until its WindowManager is set
      // (after whenReady), so this is safe even pre-ready.
      deepLinkService.handle(payload);
    } else if (app.isReady()) {
      // 无【有效】deep link 时显示并聚焦主窗口（可能被隐藏到托盘）。畸形深链
      // （extractFromArgv 命中前缀但 parse 失败）也落到这里 —— 用户点了链接
      // 期望 app 到前台，而不是毫无反应。open() 复用现有窗口并统一处理
      // restore/show/focus，若主窗口已被销毁则重新创建并重挂托盘。
      // Guard on app.isReady(): a second launch arriving before the first
      // instance finishes whenReady must not call new BrowserWindow() too early.
      // try/catch keeps a failed re-creation out of the event emitter —
      // consistent with every other open() call site (menu/tray/deep-link).
      try {
        mainApp.getWindowManager().open("main");
      } catch (error) {
        logger.error("Failed to open main window from second-instance", error);
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
