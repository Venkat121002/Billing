import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";
import ErrorBoundary from "./components/atoms/ErrorBoundary";

// Get the root DOM node
const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Error while rendering the app:", error);
    // If rendering the app fails, provide a basic error message in the UI
    const bodyElement = document.body;
    const errorMessage = document.createElement("div");
    errorMessage.style.textAlign = "center";
    errorMessage.style.marginTop = "20px";
    errorMessage.style.fontFamily = "Arial, sans-serif";
    errorMessage.style.fontSize = "18px";
    errorMessage.style.color = "red";
    errorMessage.innerText = "Network unstable, please refresh.";

    bodyElement.appendChild(errorMessage);
  }
} else {
  console.error("Root element not found in the document.");
  // If the root element is not found, show an error message
  const bodyElement = document.body;
  const errorMessage = document.createElement("div");
  errorMessage.style.textAlign = "center";
  errorMessage.style.marginTop = "20px";
  errorMessage.style.fontFamily = "Arial, sans-serif";
  errorMessage.style.fontSize = "18px";
  errorMessage.style.color = "red";
  errorMessage.innerText =
    "Root element not found. Please check the HTML structure.";

  bodyElement.appendChild(errorMessage);
}
