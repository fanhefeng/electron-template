import { protocol } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "../logger-service";
import { resourceService } from "../resource-service";

const FONT_SCHEME = "app-font";
const FONT_HOST = "fonts";

protocol.registerSchemesAsPrivileged([
  {
    scheme: FONT_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      corsEnabled: true,
      supportFetchAPI: true,
    },
  },
]);

const FONT_MIME_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

export class ProtocolService {
  private fontProtocolRegistered = false;

  registerFontProtocol(): void {
    logger.info("[protocol] registerFontProtocol called");
    if (this.fontProtocolRegistered) {
      logger.debug("[protocol] Font protocol already registered, skipping");
      return;
    }

    protocol.handle(FONT_SCHEME, async (request) => {
      try {
        const url = new URL(request.url);
        const host = url.hostname || FONT_HOST;

        if (host !== FONT_HOST) {
          logger.warn(`[protocol] Unsupported host for font request: ${host}`);
          return new Response(null, { status: 404 });
        }

        const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

        if (!relativePath) {
          logger.warn("[protocol] Missing font path in request");
          return new Response(null, { status: 404 });
        }

        const pathSegments = relativePath.split("/").filter(Boolean);

        if (pathSegments.some((seg) => seg === ".." || seg === ".")) {
          logger.warn(`[protocol] Blocked path traversal attempt: ${request.url}`);
          return new Response(null, { status: 403 });
        }

        const fontsDir = resourceService.getStaticResourcePath(host);
        const filePath = resourceService.getStaticResourcePath(host, ...pathSegments);
        const resolved = path.resolve(filePath);

        if (!resolved.startsWith(path.resolve(fontsDir) + path.sep) && resolved !== path.resolve(fontsDir)) {
          logger.warn(`[protocol] Blocked access outside fonts directory: ${resolved}`);
          return new Response(null, { status: 403 });
        }
        const extension = path.extname(filePath).slice(1).toLowerCase();
        const mimeType = FONT_MIME_TYPES[extension] ?? "application/octet-stream";
        const data = await fs.readFile(filePath);

        return new Response(data, {
          headers: {
            "Content-Type": mimeType,
          },
        });
      } catch (error) {
        logger.error(`[protocol] Failed to serve font for ${request.url}`, error);
        return new Response(null, { status: 404 });
      }
    });

    this.fontProtocolRegistered = true;
    logger.info(`[protocol] Font protocol registered: ${FONT_SCHEME}://${FONT_HOST}/`);
  }

  resolveFontUrl(fileName: string): string {
    const encodedFileName = encodeURI(fileName);
    return `${FONT_SCHEME}://${FONT_HOST}/${encodedFileName}`;
  }
}

export const protocolService = new ProtocolService();
