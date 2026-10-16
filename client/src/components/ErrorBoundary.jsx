import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-dark-800 rounded-xl p-8 border border-red-500/20">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
              <p className="text-gray-400 mb-4">
                An error occurred while loading this page. Please try refreshing.
              </p>
              
              {this.state.error && (
                <div className="w-full bg-dark-900 rounded-lg p-4 mb-4 text-left">
                  <p className="text-xs font-mono text-red-400">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="btn-secondary w-full mt-2"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
