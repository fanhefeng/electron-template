import type { BrowserWindow } from "electron";
import { app } from "electron";
import { logger } from "../logger-service";
import { IPC_CHANNELS } from "../../../shared/ipcChannels";
import type { DeepLinkPayload } from "../../../shared/deepLink";
import type { WindowManager, WindowIdentifier } from "../../window-manager/WindowManager";
import { getEnvConfig } from "../../environment";

const MAX_PENDING_PAYLOADS = 10;

export class DeepLinkService {
  private windowManager?: WindowManager;
  private pendingPayloads: DeepLinkPayload[] = [];
  // Last payload pushed to each window but not yet pulled. A freshly (re)loaded
  // renderer registers its event listener AFTER did-finish-load, so a pushed
  // message can be lost; the renderer pulls its slot on mount to close that
  // race. Keyed per window so a settings/about-targeted deep link can never be
  // drained (and misrouted) by another window's pull.
  private unconsumedPayloads = new Map<WindowIdentifier, DeepLinkPayload>();

  private get scheme(): string {
    return getEnvConfig().deepLinkScheme;
  }

  register(): void {
    logger.info("[service:deepLink] register called");
    if (!app.isPackaged && process.argv[1]) {
      // 开发模式下需要传入可执行路径才能正确注册协议。argv[1] 可能为 undefined
      // （无脚本参数启动）——此时回退到无参注册，避免注册出错误的启动命令。
      app.setAsDefaultProtocolClient(this.scheme, process.execPath, [process.argv[1]]);
    } else {
      app.setAsDefaultProtocolClient(this.scheme);
    }
    logger.info(`[service:deepLink] protocol registered: ${this.scheme}://`);
  }

  setWindowManager(windowManager: WindowManager): void {
    logger.info("[service:deepLink] setWindowManager called");
    this.windowManager = windowManager;

    // 处理所有等待中的 payload（app 冷启动时收到的 deep link）
    if (this.pendingPayloads.length > 0) {
      const payloads = [...this.pendingPayloads];
      this.pendingPayloads = [];
      for (const payload of payloads) {
        this.handle(payload);
      }
    }
  }

  parse(url: string): DeepLinkPayload | null {
    logger.debug(`[service:deepLink] parse called, url=${url}`);
    if (!url || !url.startsWith(`${this.scheme}://`)) {
      logger.debug(`[service:deepLink] parse rejected: not a ${this.scheme}:// URL`);
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
      logger.error("[service:deepLink] parse failed", error);
      return null;
    }
  }

  handle(payload: DeepLinkPayload | null): void {
    if (!payload) {
      return;
    }

    logger.info(`[service:deepLink] handle called, raw=${payload.raw}`);

    if (!this.windowManager) {
      // WindowManager 未就绪，加入等待队列（有上限，防止恶意刷深链撑爆内存）
      if (this.pendingPayloads.length >= MAX_PENDING_PAYLOADS) {
        logger.warn("[service:deepLink] pending queue full, dropping oldest payload");
        this.pendingPayloads.shift();
      }
      this.pendingPayloads.push(payload);
      return;
    }

    // 打开/聚焦目标窗口。open() 失败必须捕获：冷启动排空队列时一个异常会
    // 直接拒绝 MainApp.init() → process.exit(1)，一条坏深链不应让 app 启动崩溃。
    const targetWindow = this.resolveWindow(payload.window);
    let browserWindow: BrowserWindow;
    try {
      browserWindow = this.windowManager.open(targetWindow);
    } catch (error) {
      logger.error(`[service:deepLink] failed to open window "${targetWindow}" for deep link`, error);
      return;
    }

    // 确保内容加载完成后发送 payload
    let sent = false;
    const sendOnce = () => {
      if (sent) return;
      sent = true;
      this.sendToRenderer(browserWindow, payload, targetWindow);
    };

    if (browserWindow.webContents.isLoading()) {
      // 超时保护：若 10 秒内未加载完成，仍尝试发送
      const timeoutId = setTimeout(() => {
        if (!browserWindow.isDestroyed()) {
          browserWindow.webContents.removeListener("did-finish-load", onLoad);
        }
        sendOnce();
      }, 10_000);

      const onLoad = () => {
        clearTimeout(timeoutId);
        sendOnce();
      };

      browserWindow.webContents.once("did-finish-load", onLoad);
    } else {
      sendOnce();
    }
  }

  /** 从 argv 中提取 deep link URL（用于 second-instance） */
  extractFromArgv(argv: string[]): string | undefined {
    return argv.find((arg) => arg.startsWith(`${this.scheme}://`));
  }

  /**
   * Pull model for the cold-start race: a renderer calls this on mount to
   * fetch a deep link it may have missed (pushed between did-finish-load and
   * React registering its listener). Consuming clears that window's slot. The
   * caller's window identity is derived from the IPC sender by the handler —
   * never from renderer-supplied data — so windows cannot drain each other.
   */
  consumePending(windowId: WindowIdentifier): DeepLinkPayload | null {
    const payload = this.unconsumedPayloads.get(windowId) ?? null;
    logger.info(`[service:deepLink] consumePending called (window=${windowId}, has=${payload !== null})`);
    this.unconsumedPayloads.delete(windowId);
    return payload;
  }

  private resolveWindow(target: string): WindowIdentifier {
    const validWindows: WindowIdentifier[] = ["main", "about", "settings"];
    if (validWindows.includes(target as WindowIdentifier)) {
      return target as WindowIdentifier;
    }
    return "main";
  }

  private sendToRenderer(browserWindow: BrowserWindow, payload: DeepLinkPayload, targetWindow: WindowIdentifier): void {
    if (!browserWindow.isDestroyed()) {
      logger.info(`[service:deepLink] sendToRenderer: window=${browserWindow.id}, path=${payload.path}`);
      // Keep a pull-able copy in the TARGET window's slot: the push is lost if
      // that renderer's listener isn't registered yet (cold start / reload).
      // Trade-off: if the push DID arrive, a later reload may replay this
      // payload once — benign for a template, and far better than dropping
      // cold-start links.
      this.unconsumedPayloads.set(targetWindow, payload);
      browserWindow.webContents.send(IPC_CHANNELS.DEEP_LINK_NAVIGATE, payload);
    } else {
      logger.warn("[service:deepLink] sendToRenderer: target window already destroyed");
    }
  }
}

export const deepLinkService = new DeepLinkService();
