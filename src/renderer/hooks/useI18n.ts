import { useCallback, useEffect, useState } from "react";

export const useI18n = () => {
  // null = dictionary not loaded yet. Callers gate their first paint on
  // `ready` so the UI never flashes raw dotted keys ("app.title", …) during
  // the initial getMessages() round-trip.
  const [messages, setMessages] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const bridge = window.app;
    if (!bridge) return;

    const loadMessages = () => {
      bridge
        .getMessages()
        .then(setMessages)
        .catch((error) => {
          // Surface in BOTH places: devtools for the developer at hand, and the
          // main log file so an i18n load failure is reconstructable from logs.
          console.error("[useI18n] failed to load messages", error);
          window.log?.error("i18n-load-failed", String(error));
        });
    };

    loadMessages();
    const handleSettingsUpdated = () => loadMessages();
    bridge.onSettingsUpdated(handleSettingsUpdated);

    return () => {
      bridge.offSettingsUpdated(handleSettingsUpdated);
    };
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      let value = messages?.[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          // Function replacer: a string replacement would interpret `$&`/`$$`
          // etc. in the param VALUE as replacement patterns and garble it
          // (e.g. an updater error message containing "$&").
          value = value.replaceAll(`{${k}}`, () => v);
        }
      }
      return value;
    },
    [messages]
  );

  return { t, ready: messages !== null };
};
