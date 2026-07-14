import React, { Component, ReactNode, useEffect } from 'react';

const isWebSocketError = (msg: string) => {
  if (typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return lower.includes('websocket') || lower.includes('[vite]') || lower.includes('websocket closed without opened') || msg === '[object Object]';
};

export const GlobalErrorListener: React.FC = () => {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      let errObj = 'error' in event ? event.error : event.reason;
      let msg = 'message' in event ? event.message : (errObj && errObj.message) || String(errObj);
      
      if (isWebSocketError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    };

    window.addEventListener('error', handleGlobalError as any, true);
    window.addEventListener('unhandledrejection', handleGlobalError as any, true);

    return () => {
      window.removeEventListener('error', handleGlobalError as any, true);
      window.removeEventListener('unhandledrejection', handleGlobalError as any, true);
    };
  }, []);

  return null;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Global Reporter] Component Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errMsg = String(this.state.error);
      if (this.state.error instanceof Error) {
         errMsg = this.state.error.message + '\n' + this.state.error.stack;
      } else if (typeof this.state.error === 'object') {
         try {
           errMsg = JSON.stringify(this.state.error, Object.getOwnPropertyNames(this.state.error), 2);
         } catch(e) {}
      }

      return (
        <div className="p-10 text-red-500 min-h-screen bg-slate-900 flex flex-col items-center justify-center font-mono">
          <h1 className="text-2xl font-bold mb-4">Component Crash Detected</h1>
          <pre className="bg-black/50 p-6 rounded text-sm max-w-2xl overflow-auto border border-red-500/30 whitespace-pre-wrap">{errMsg}</pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-6 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
          >
            Attempt Recovery
          </button>
        </div>
      );
    }
    
    return (
      <>
        <GlobalErrorListener />
        {this.props.children}
      </>
    );
  }
}
