import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state to display fallback UI
    return { hasError: true };
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Oops! Something went wrong.
          </h1>
          <p className="mt-4 text-gray-700">
            Please refresh the page to try again.
          </p>
          <button
            className="mt-6 px-4 py-2 bg-emerald-600 text-black rounded-lg shadow hover:bg-emerald-700"
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
