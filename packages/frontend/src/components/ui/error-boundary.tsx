"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">出错了</h2>
            <p className="mb-4 text-sm text-muted-foreground">应用遇到了意外错误，请尝试刷新页面。</p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="mb-2 cursor-pointer text-xs font-medium text-muted-foreground">错误详情</summary>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs text-destructive">{this.state.error.message}</pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-2">
              <Button variant="default" onClick={this.handleReset}><RotateCcw className="mr-2 h-4 w-4" />重试</Button>
              <Button variant="outline" onClick={this.handleReload}><RefreshCw className="mr-2 h-4 w-4" />刷新页面</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
