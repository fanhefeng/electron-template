import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

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
          <h2>{document.documentElement.lang?.startsWith("zh") ? "出现错误" : "Something went wrong"}</h2>
          <p>
            {document.documentElement.lang?.startsWith("zh")
              ? "发生了意外错误���请尝试重新加载窗口。"
              : "An unexpected error occurred. Please try reloading the window."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
