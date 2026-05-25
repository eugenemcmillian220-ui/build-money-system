// src/components/dashboard/ErrorBoundaries.tsx
'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState { hasError: boolean; error?: Error }

// ─── Dashboard Root Error Boundary ───────────────────────────
export class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8" role="alert">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950">
          <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => this.setState({ hasError: false })} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try Again
          </Button>
          <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }} className="gap-2">
            <Home className="h-4 w-4" aria-hidden="true" /> Go Home
          </Button>
        </div>
      </div>
    );
  }
}

// ─── Phase Output Error Boundary ─────────────────────────────
export class PhaseOutputErrorBoundary extends React.Component<
  { children: React.ReactNode; phaseName?: string },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  override componentDidCatch(error: Error) { Sentry.captureException(error); }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="border border-border rounded-xl p-4 flex items-center justify-between" role="alert">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Phase output unavailable{this.props.phaseName ? ` (${this.props.phaseName})` : ''}
        </div>
        <Button size="sm" variant="ghost" onClick={() => this.setState({ hasError: false })} className="gap-1">
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Retry
        </Button>
      </div>
    );
  }
}

// ─── Generator Form Error Boundary ───────────────────────────
export class GeneratorFormErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  override componentDidCatch(error: Error) { Sentry.captureException(error); }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="border border-red-200 dark:border-red-900 rounded-xl p-6 space-y-3" role="alert">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">Form error</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The generator form encountered an error.{' '}
          <a href="mailto:support@sovereignforge.ai" className="underline">Contact support</a> if this persists.
        </p>
        <Button size="sm" onClick={() => this.setState({ hasError: false })}>
          Reset Form
        </Button>
      </div>
    );
  }
}
