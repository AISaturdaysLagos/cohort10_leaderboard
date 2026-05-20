import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            maxWidth: 560,
            margin: "48px auto",
            padding: 24,
            border: "1px solid #c00",
            borderRadius: 12,
            background: "#fff5f5",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>Something went wrong</h1>
          <p style={{ margin: "0 0 12px", color: "#333" }}>
            The app hit a runtime error. Check the browser console for details.
          </p>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: "#fff",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
