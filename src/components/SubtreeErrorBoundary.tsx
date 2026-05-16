import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

type State = { hasError: boolean };

/** Catches render errors under a subtree (e.g. HealthKit hooks) without blanking the whole app. */
export class SubtreeErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[IronLore] SubtreeErrorBoundary:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
