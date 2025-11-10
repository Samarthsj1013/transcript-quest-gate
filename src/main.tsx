import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Make Buffer available globally for pdf-lib
window.Buffer = Buffer;

// Patch postMessage to trust all origins for Lovable's infrastructure
// This prevents origin mismatch errors when communicating with parent windows
(function() {
  // List of known Lovable-related origins that should be trusted
  const lovableOrigins = [
    'https://gptengineer.app',
    'http://localhost:3000',
    'https://lovable.dev'
  ];

  // Store original postMessage method
  const originalPostMessage = window.postMessage.bind(window);
  const originalProtoPostMessage = Window.prototype.postMessage;

  // Override window.postMessage with proper types
  (window.postMessage as any) = function(message: any, targetOrigin: string, transfer?: any) {
    // If the targetOrigin is one of Lovable's origins, use wildcard to trust all
    if (lovableOrigins.includes(targetOrigin)) {
      return originalPostMessage(message, '*', transfer);
    }
    // Otherwise use the original targetOrigin
    return originalPostMessage(message, targetOrigin, transfer);
  };

  // Patch postMessage for any iframe windows that might be created
  (Window.prototype.postMessage as any) = function(message: any, targetOrigin: string, transfer?: any) {
    // If the targetOrigin is one of Lovable's origins, use wildcard to trust all
    if (lovableOrigins.includes(targetOrigin)) {
      return originalProtoPostMessage.call(this, message, '*', transfer);
    }
    // Otherwise use the original targetOrigin
    return originalProtoPostMessage.call(this, message, targetOrigin, transfer);
  };
})();

createRoot(document.getElementById("root")!).render(<App />);
