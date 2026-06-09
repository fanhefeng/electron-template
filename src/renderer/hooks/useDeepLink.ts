import { useEffect, useRef } from "react";
import type { DeepLinkPayload } from "@shared/deepLink";

interface DeepLinkApi {
  onDeepLink: (listener: (_event: unknown, payload: DeepLinkPayload) => void) => void;
  offDeepLink: (listener: (_event: unknown, payload: DeepLinkPayload) => void) => void;
  consumePendingDeepLink: () => Promise<DeepLinkPayload | null>;
}

interface DeepLinkLogger {
  info: (action: string, details?: string) => void;
  error: (action: string, details?: string) => void;
}

/**
 * Shared deep-link wiring for every window (main/settings/about expose the
 * same trio on their preload APIs): registers the push listener AND pulls the
 * per-window slot on mount — the push from main can fire between
 * did-finish-load and React mounting, so the pull closes that race. When the
 * push DID arrive, the slot is drained so a later reload doesn't replay it.
 * `onPayload` is optional; windows that only need the receipt log omit it.
 */
export const useDeepLink = (
  api: DeepLinkApi | undefined,
  logger: DeepLinkLogger,
  onPayload?: (payload: DeepLinkPayload) => void
): void => {
  // Ref so a new onPayload identity per render doesn't tear down and
  // re-register the IPC listener (written in an effect, not during render).
  const onPayloadRef = useRef(onPayload);
  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    if (!api) return;

    const handleDeepLink = (_event: unknown, payload: DeepLinkPayload) => {
      logger.info("deep-link-received", `path=${payload.path} params=${JSON.stringify(payload.params)}`);
      onPayloadRef.current?.(payload);
    };
    const handlePushedDeepLink = (event: unknown, payload: DeepLinkPayload) => {
      handleDeepLink(event, payload);
      // The push reached us — drain this window's pull slot so a later reload
      // doesn't replay the already-handled deep link.
      api.consumePendingDeepLink().catch((error) => logger.error("drain-pending-deep-link-failed", String(error)));
    };

    api.onDeepLink(handlePushedDeepLink);
    api
      .consumePendingDeepLink()
      .then((payload) => {
        if (payload) handleDeepLink(undefined, payload);
      })
      .catch((error) => logger.error("consume-pending-deep-link-failed", String(error)));
    return () => {
      api.offDeepLink(handlePushedDeepLink);
    };
  }, [api, logger]);
};
