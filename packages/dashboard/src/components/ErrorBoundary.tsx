"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--accent-red)",
            }}
          >
            <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {this.state.error?.message}
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
