import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { en } from "@shared/locales/en";
import { zhCN } from "@shared/locales/zh-CN";

const getErrorText = (key: string): string => {
  const isZh = document.documentElement.lang?.startsWith("zh");
  const dict = isZh ? zhCN : en;
  return dict[key] ?? key;
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.log?.error("uncaught-render-error", `${error.message}\n${info.componentStack ?? ""}`);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            blockSize: "100vh",
            paddingInline: "2rem",
            fontFamily: "var(--app-font-family, system-ui)",
          }}
        >
          <h2>{getErrorText("error.boundary.title")}</h2>
          <p>{getErrorText("error.boundary.message")}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
