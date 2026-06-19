import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Card, Button } from './UI';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error :", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-6 min-h-[300px]">
          <Card className="max-w-md p-6 border-rose-500/30 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Oups, un affichage a échoué</h3>
              <p className="text-xs text-zinc-450 mt-1.5 leading-relaxed">
                Une exception d'interface est survenue. Veuillez rafraîchir l'application ou réessayer plus tard.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] text-zinc-550 bg-zinc-950 p-2.5 rounded-lg text-left overflow-x-auto font-mono max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="h-9 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Réessayer
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
