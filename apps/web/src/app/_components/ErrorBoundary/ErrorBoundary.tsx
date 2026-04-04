'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * When true, automatically attempt recovery by reloading the page after a
   * short delay. Useful for transient errors caused by HMR / server restart.
   */
  autoRecover?: boolean;
};

type State = {
  hasError: boolean;
  retryCount: number;
};

/** Stop auto-recovering after this many consecutive failures to avoid loops. */
const MAX_AUTO_RETRIES = 3;

export class ErrorBoundary extends Component<Props, State> {
  private recoverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[ErrorBoundary] caught error during render:',
        error.message,
        info.componentStack
      );
    }
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError && this.props.autoRecover) {
      if (this.state.retryCount < MAX_AUTO_RETRIES) {
        this.scheduleRecovery();
      }
    }
  }

  componentWillUnmount(): void {
    if (this.recoverTimer) {
      clearTimeout(this.recoverTimer);
    }
  }

  private scheduleRecovery(): void {
    if (this.recoverTimer) clearTimeout(this.recoverTimer);
    this.recoverTimer = setTimeout(() => {
      this.setState((prev) => ({ hasError: false, retryCount: prev.retryCount + 1 }));
    }, 500);
  }

  reset = () => {
    this.setState({ hasError: false, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Something went wrong.</p>
          <button
            onClick={this.reset}
            className="mt-2 text-sm text-primary underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
