import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Clerk publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Web vitals initialization removed - observability module was cleaned up

// Render React app immediately
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ClerkProvider publishableKey={clerkPubKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </HelmetProvider>
  </StrictMode>
);
