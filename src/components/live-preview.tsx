"use client";

import React, { Component, type ReactNode, type ErrorInfo, useState, useEffect } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Live preview error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: "oklch(0.65 0.15 25 / 0.1)",
            borderColor: "oklch(0.65 0.15 25 / 0.3)",
          }}
        >
          <h3 className="font-semibold text-sm mb-2" style={{ color: "oklch(0.55 0.18 25)" }}>
            Preview Error
          </h3>
          <p className="text-xs" style={{ color: "oklch(0.55 0.18 25)" }}>
            {this.state.error?.message || "Failed to render preview"}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function createRefObject(initialValue: unknown) {
  return { current: initialValue };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scope: Record<string, any> = {
  React,
  useState,
  useEffect,
  useCallback: (fn: (...args: unknown[]) => unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  useRef: createRefObject,
  useContext: () => ({}),
  useReducer: () => [{}, () => {}],
  useId: () => "id",
  Fragment: ({ children }: { children: ReactNode }) => children,
  StrictMode: ({ children }: { children: ReactNode }) => children,
  Suspense: ({ children }: { children: ReactNode }) => children,
  memo: (component: Component) => component,
  forwardRef: (component: unknown) => component,
  createContext: () => ({}),
  Children: {
    map: (children: ReactNode, fn: (child: ReactNode) => ReactNode) =>
      Array.isArray(children) ? children.map(fn) : fn(children),
    forEach: (children: ReactNode, fn: (child: ReactNode) => void) => {
      if (Array.isArray(children)) {
        children.forEach(fn);
      } else {
        fn(children);
      }
    },
    count: (children: ReactNode) =>
      Array.isArray(children) ? children.length : 1,
    only: (children: ReactNode) => children,
    toArray: (children: ReactNode) => (Array.isArray(children) ? children : [children]),
  },
  Component: class extends Component {}, // eslint-disable-line react/display-name
};

interface LivePreviewProps {
  code: string;
}

type ReactLiveLib = {
  LiveProvider: typeof import("react-live").LiveProvider;
  LivePreview: typeof import("react-live").LivePreview;
  LiveError: typeof import("react-live").LiveError;
};

function LivePreviewInner({ code }: LivePreviewProps) {
  const [LiveLib, setLiveLib] = useState<ReactLiveLib | null>(null);

  useEffect(() => {
    let mounted = true;
    import("react-live").then((lib) => {
      if (mounted) {
        setLiveLib({
          LiveProvider: lib.LiveProvider,
          LivePreview: lib.LivePreview,
          LiveError: lib.LiveError,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  let transformCode = code;
  
  if (code.includes("export default") || code.includes("export {")) {
    const defaultMatch = code.match(/export\s+default\s+(\w+)/);
    if (defaultMatch) {
      const componentName = defaultMatch[1];
      transformCode = `
        import React from 'react';
        ${code}
        
        ${componentName};
      `;
    }
  }

  if (!LiveLib) {
    return (
      <div
        className="p-4 rounded-lg border min-h-[200px] flex items-center justify-center"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
        }}
      >
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading preview...
        </span>
      </div>
    );
  }

  const { LiveProvider: LP, LivePreview: LPreview, LiveError: LError } = LiveLib;

  return (
    <ErrorBoundary>
      <LP code={transformCode} scope={scope} noInline={false}>
        <div
          className="p-4 rounded-lg border min-h-[200px] flex items-center justify-center"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <LPreview />
        </div>
        <LError
          className="mt-2 p-2 rounded text-xs font-mono overflow-auto max-h-24"
          style={{
            background: "oklch(0.65 0.15 25 / 0.1)",
            color: "oklch(0.55 0.18 25)",
            border: "1px solid oklch(0.65 0.15 25 / 0.2)",
          }}
        />
      </LP>
    </ErrorBoundary>
  );
}

LivePreviewInner.displayName = "LivePreviewInner";

export function LivePreview({ code }: LivePreviewProps) {
  if (!code) {
    return (
      <div
        className="p-8 rounded-lg border text-center"
        style={{
          background: "var(--muted)",
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <p className="text-sm">Select a component file to preview</p>
      </div>
    );
  }

  const isComponent = 
    code.includes("function") || 
    code.includes("=>") || 
    code.includes("class") ||
    code.includes("export default");

  if (!isComponent) {
    return (
      <div
        className="p-8 rounded-lg border text-center"
        style={{
          background: "var(--muted)",
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <p className="text-sm">Preview available for component files only</p>
      </div>
    );
  }

  return <LivePreviewInner code={code} />;
}
