import type { BrowserWindow } from "electron";
import { app } from "electron";
import { logger } from "../logger-service";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { DeepLinkPayload } from "../../../shared/deepLink";
import type { WindowManager, WindowIdentifier } from "../../window-manager/WindowManager";
import { getEnvConfig } from "../../environment";

export class DeepLinkService {
  private windowManager?: WindowManager;
  private pendingPayload: DeepLinkPayload | null = null;

  private get scheme(): string {
    return getEnvConfig().deepLinkScheme;
  }

  register(): void {
    if (!app.isPackaged) {
      // 开发模式下需要传入可执行路径才能正确注册协议
      app.setAsDefaultProtocolClient(this.scheme, process.execPath, [process.argv[1]]);
    } else {
      app.setAsDefaultProtocolClient(this.scheme);
    }
    logger.info(`Deep link protocol registered: ${this.scheme}://`);
  }

  setWindowManager(windowManager: WindowManager): void {
    this.windowManager = windowManager;

    // 如果有等待处理的 payload（app 冷启动时收到 deep link）
    if (this.pendingPayload) {
      this.handle(this.pendingPayload);
      this.pendingPayload = null;
    }
  }

  parse(url: string): DeepLinkPayload | null {
    if (!url || !url.startsWith(`${this.scheme}://`)) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const window = parsed.hostname || "main";
      const path = parsed.pathname.replace(/^\/+/, "");

      // 限制 path 长度并过滤控制字符（U+0000 – U+001F）
      // eslint-disable-next-line no-control-regex
      const sanitizedPath = path.slice(0, 256).replace(/[\u0000-\u001f]/g, "");

      // 限制参数数量和长度
      const params: Record<string, string> = {};
      let paramCount = 0;
      parsed.searchParams.forEach((value, key) => {
        if (paramCount >= 20) return;
        params[key.slice(0, 128)] = value.slice(0, 1024);
        paramCount++;
      });

      return { raw: url, window, path: sanitizedPath, params };
    } catch (error) {
      logger.error("Failed to parse deep link URL", error);
      return null;
    }
  }

  handle(payload: DeepLinkPayload | null): void {
    if (!payload) {
      return;
    }

    logger.info("Handling deep link:", payload.raw);

    if (!this.windowManager) {
      // WindowManager 未就绪，缓存等待
      this.pendingPayload = payload;
      return;
    }

    // 打开/聚焦目标窗口
    const targetWindow = this.resolveWindow(payload.window);
    const browserWindow = this.windowManager.open(targetWindow);

    // 确保内容加载完成后发送 payload
    let sent = false;
    const sendOnce = () => {
      if (sent) return;
      sent = true;
      this.sendToRenderer(browserWindow, payload);
    };

    if (browserWindow.webContents.isLoading()) {
      browserWindow.webContents.once("did-finish-load", sendOnce);
      // 超时保护：若 10 秒内未加载完成，仍尝试发送
      setTimeout(() => {
        if (!browserWindow.isDestroyed()) {
          browserWindow.webContents.removeListener("did-finish-load", sendOnce);
        }
        sendOnce();
      }, 10_000);
    } else {
      sendOnce();
    }
  }

  /** 从 argv 中提取 deep link URL（用于 second-instance） */
  extractFromArgv(argv: string[]): string | undefined {
    return argv.find((arg) => arg.startsWith(`${this.scheme}://`));
  }

  private resolveWindow(target: string): WindowIdentifier {
    const validWindows: WindowIdentifier[] = ["main", "about", "settings"];
    if (validWindows.includes(target as WindowIdentifier)) {
      return target as WindowIdentifier;
    }
    return "main";
  }

  private sendToRenderer(browserWindow: BrowserWindow, payload: DeepLinkPayload): void {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send(IPC_CHANNELS.DEEP_LINK_NAVIGATE, payload);
    }
  }
}

export const deepLinkService = new DeepLinkService();
