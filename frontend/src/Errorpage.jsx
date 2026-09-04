const ErrorPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500">404</h1>
        <p className="mt-4 text-xl text-red-600">
          Oops! Page not found.
        </p>
        <a
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
};

export default ErrorPage;
