import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Clerk publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

/**
 * Schedule a callback using requestIdleCallback with setTimeout fallback
 */
const scheduleIdle = (
  callback: () => void | Promise<void>,
  options?: { timeout: number }
): void => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (
      window as Window & {
        requestIdleCallback: (
          cb: () => void,
          opts?: { timeout: number }
        ) => void;
      }
    ).requestIdleCallback(() => {
      void callback();
    }, options);
  } else {
    setTimeout(() => {
      void callback();
    }, 1);
  }
};

/**
 * Initialize Sentry and observability in a deferred, non-blocking manner
 *
 * This improves LCP by:
 * 1. Not importing Sentry synchronously (it's a large bundle)
 * 2. Deferring initialization until the browser is idle
 * 3. Still capturing errors that occur after initial load
 * 4. Web Vitals tracking starts after Sentry is ready
 */
const initializeObservabilityDeferred = (): void => {
  scheduleIdle(
    async () => {
      try {
        // Dynamic import to avoid loading Sentry in the critical path
        const { initSentry } = await import("./lib/sentry");
        initSentry();

        // After Sentry is initialized, start Web Vitals tracking
        // This is done in a separate idle callback to further avoid blocking
        scheduleIdle(
          async () => {
            try {
              const { initWebVitals } = await import(
                "./lib/observability/web-vitals"
              );
              initWebVitals();
            } catch (error) {
              // Silently fail - observability should never break the app
              if (import.meta.env.DEV) {
                console.warn("Failed to initialize Web Vitals:", error);
              }
            }
          },
          { timeout: 5000 }
        );
      } catch (error) {
        // Silently fail if Sentry fails to load - don't break the app
        if (import.meta.env.DEV) {
          console.warn("Failed to initialize Sentry:", error);
        }
      }
    },
    { timeout: 3000 } // Initialize within 3 seconds even if browser is busy
  );
};

// Initialize observability (non-blocking)
initializeObservabilityDeferred();

// Render React app immediately
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
);
