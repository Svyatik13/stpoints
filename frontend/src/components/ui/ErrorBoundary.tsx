'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-fade-up">
            <span className="text-5xl block mb-4">💥</span>
            <h2 className="text-xl font-bold mb-2">Něco se pokazilo</h2>
            <p className="text-text-secondary text-sm mb-6">
              {this.state.error?.message || 'Neočekávaná chyba aplikace.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/wallet';
              }}
              className="btn-primary"
            >
              Zpět na hlavní stránku
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
