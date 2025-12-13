import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  onReset?: () => void;
  children: React.ReactNode;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Tentativa de reportar para Sentry se disponível globalmente; caso contrário, log local
    const sentry = (window as unknown as { Sentry?: { captureException?: (err: unknown, ctx?: unknown) => void } }).Sentry;
    if (sentry?.captureException) {
      sentry.captureException(error, { extra: errorInfo });
    } else {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught an error", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center text-container-foreground">
          <div className="max-w-lg rounded-2xl border border-black/10 bg-container p-6 shadow">
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted">
              Encontramos um problema ao carregar esta página. Tente atualizar ou volte para o início.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 sm:w-auto"
              >
                Recarregar
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold text-container-foreground transition hover:bg-black/5 sm:w-auto"
              >
                Voltar
              </button>
            </div>
            {!import.meta.env.PROD && this.state.error ? (
              <pre className="mt-4 max-h-32 overflow-auto rounded bg-black/5 p-2 text-left text-xs text-muted">
                {this.state.error.message}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
