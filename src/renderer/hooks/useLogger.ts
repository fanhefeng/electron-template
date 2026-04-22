import { useCallback, useEffect } from "react";

interface Logger {
  info: (action: string, details?: string) => void;
  warn: (action: string, details?: string) => void;
  error: (action: string, details?: string) => void;
  debug: (action: string, details?: string) => void;
  click: (target: string) => void;
  change: (target: string, value?: string) => void;
  submit: (formName: string) => void;
}

export const useLogger = (componentName: string): Logger => {
  const info = useCallback((action: string, details?: string) => {
    window.log?.info(action, details);
  }, []);

  const warn = useCallback((action: string, details?: string) => {
    window.log?.warn(action, details);
  }, []);

  const error = useCallback((action: string, details?: string) => {
    window.log?.error(action, details);
  }, []);

  const debug = useCallback((action: string, details?: string) => {
    window.log?.debug(action, details);
  }, []);

  const click = useCallback((target: string) => {
    window.log?.info("click", target);
  }, []);

  const change = useCallback((target: string, value?: string) => {
    window.log?.info("change", value !== undefined ? `${target} → ${value}` : target);
  }, []);

  const submit = useCallback((formName: string) => {
    window.log?.info("submit", formName);
  }, []);

  // componentName intentionally excluded from deps — we only log the initial mount/unmount
  useEffect(() => {
    window.log?.info("mount", `${componentName} component`);
    return () => {
      window.log?.info("unmount", `${componentName} component`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { info, warn, error, debug, click, change, submit };
};
