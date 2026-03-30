import type { Component, ReactNode, CSSProperties } from "react";

export interface LiveProviderProps {
  code: string;
  scope?: Record<string, unknown>;
  noInline?: boolean;
  language?: string;
  disabled?: boolean;
  theme?: object;
  children?: ReactNode;
}

export interface LivePreviewProps {
  className?: string;
  style?: CSSProperties;
}

export interface LiveErrorProps {
  className?: string;
  style?: CSSProperties;
}

export interface LiveEditorProps {
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  code?: string;
  language?: string;
  onChange?: (code: string) => void;
}

export interface LiveContextValue {
  code: string;
  language: string;
  theme?: object;
  disabled: boolean;
  noInline: boolean;
  error: string | null;
}

export class LiveProvider extends Component<LiveProviderProps> {
  static displayName: string;
}

export const LivePreview: Component<LivePreviewProps>;
export const LiveError: Component<LiveErrorProps>;
export const LiveEditor: Component<LiveEditorProps>;

export function useLive(): LiveContextValue;

export function createClass(spec: object): Component;
