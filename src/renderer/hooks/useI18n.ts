import { useCallback, useEffect, useState } from "react";

export const useI18n = () => {
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const bridge = window.app;
    if (!bridge) return;

    const loadMessages = () => {
      bridge.getMessages().then(setMessages).catch(console.error);
    };

    loadMessages();
    bridge.onSettingsUpdated(loadMessages);

    return () => {
      bridge.offSettingsUpdated(loadMessages);
    };
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      let value = messages[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replaceAll(`{${k}}`, v);
        }
      }
      return value;
    },
    [messages]
  );

  return { t };
};
