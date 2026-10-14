import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunk =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('error loading dynamically imported module') ||
      error.message?.includes('Importing a module script failed');
    return {
      hasError: true,
      isChunkError: isChunk,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Sanctra ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    // Clear potentially cached stale index or session storage markers
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="sanctra-app min-h-dvh grid place-items-center p-6 bg-slate-950 text-slate-100">
          <section className="analytics-card glass-panel p-8 max-w-md w-full space-y-5 text-center border border-white/15 rounded-3xl shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {this.state.isChunkError ? <RotateCcw size={22} /> : <AlertTriangle size={22} />}
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                {this.state.isChunkError
                  ? 'A new version of Sanctra is ready'
                  : 'Something interrupted this view'}
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                {this.state.isChunkError
                  ? 'Sanctra was updated with fresh assets. Reload to get the latest features and continue studying seamlessly.'
                  : 'Your focus data and local sessions remain safe. Please reload the workspace.'}
              </p>
            </div>

            <button
              type="button"
              className="analytics-button w-full py-2.5 px-4 rounded-full font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
              onClick={this.handleReload}
            >
              <RotateCcw size={14} />
              <span>Reload Sanctra</span>
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
