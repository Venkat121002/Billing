import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state to display fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details (can be sent to a logging service like Sentry)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRefresh = () => {
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI with Refresh button
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-6">
          <h1 className="text-2xl font-bold text-red-600">
            Oops! Something went wrong.
          </h1>
          <p className="mt-4 text-gray-700">
            Please refresh the page to try again.
          </p>
          {this.state.error && (
            <div className="mt-4 max-w-xl text-left bg-red-50 border border-red-200 p-4 rounded-lg text-red-800 text-xs font-mono overflow-auto">
              <p className="font-bold">{this.state.error.toString()}</p>
            </div>
          )}
          <button
            className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700"
            onClick={this.handleRefresh}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    // Render children if no error
    return this.props.children;
  }
}

export default ErrorBoundary;
