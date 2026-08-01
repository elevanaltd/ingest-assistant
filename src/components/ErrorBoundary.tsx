import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          maxWidth: '800px',
          margin: '50px auto',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning)',
          borderRadius: '8px',
        }}>
          <h2 style={{ color: 'var(--color-warning-text)', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-warning-text)' }}>
            The application encountered an unexpected error. This might be due to:
          </p>
          <ul style={{ color: 'var(--color-warning-text)' }}>
            <li>Missing Electron API (ensure the app is running in Electron)</li>
            <li>Configuration issues</li>
            <li>Network or file system problems</li>
          </ul>

          {this.state.error && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-danger-text)' }}>
                Error Details (click to expand)
              </summary>
              <pre style={{
                backgroundColor: 'var(--color-danger-bg)',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                color: 'var(--color-danger-text)',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
