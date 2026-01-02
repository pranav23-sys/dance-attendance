"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // In a real app, you might want to log this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-xl">
              <span className="text-2xl">⚠️</span>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Oops! Something went wrong</h1>
              <p className="text-neutral-400">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-neutral-900 p-4 rounded-lg text-sm">
                <summary className="cursor-pointer text-neutral-300 mb-2">Error Details</summary>
                <pre className="text-red-400 text-xs overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition active:scale-95"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-6 py-3 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition active:scale-95"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
