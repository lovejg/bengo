import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './atoms/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h2 className="mb-2">문제가 발생했습니다</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              예상치 못한 오류가 발생했습니다. 불편을 드려 죄송합니다.
            </p>
            {this.state.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6 font-mono text-left overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => window.location.reload()} className="flex-1">
                새로고침
              </Button>
              <Button onClick={this.handleReset} className="flex-1">
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
