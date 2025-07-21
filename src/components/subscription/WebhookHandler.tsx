import React, { useEffect } from "react";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { handleStripeWebhook } from "../../services/stripe";

interface WebhookHandlerProps {
  children: React.ReactNode;
}

export const WebhookHandler: React.FC<WebhookHandlerProps> = ({ children }) => {
  const { initializeSubscription } = useSubscriptionStore();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Listen for Stripe webhook events
    const handleWebhookEvent = (event: MessageEvent) => {
      // Only handle events from our backend
      if (event.origin !== window.location.origin) {
        return;
      }

      try {
        const data = event.data;

        // Check if this is a Stripe webhook event
        if (data.type === "stripe-webhook") {
          console.log("Received Stripe webhook event:", data.event);

          // Handle the webhook event
          handleStripeWebhook(data.event);

          // Refresh subscription data if user is authenticated
          if (isAuthenticated && user) {
            initializeSubscription();
          }
        }
      } catch (error) {
        console.error("Error handling webhook event:", error);
      }
    };

    // Listen for postMessage events (for webhook handling)
    window.addEventListener("message", handleWebhookEvent);

    // Also listen for custom events (alternative approach)
    const handleCustomWebhookEvent = (event: CustomEvent) => {
      console.log("Received custom webhook event:", event.detail);

      // Handle the webhook event
      handleStripeWebhook(event.detail);

      // Refresh subscription data if user is authenticated
      if (isAuthenticated && user) {
        initializeSubscription();
      }
    };

    window.addEventListener(
      "stripe-webhook",
      handleCustomWebhookEvent as EventListener
    );

    return () => {
      window.removeEventListener("message", handleWebhookEvent);
      window.removeEventListener(
        "stripe-webhook",
        handleCustomWebhookEvent as EventListener
      );
    };
  }, [isAuthenticated, user, initializeSubscription]);

  // Poll for subscription updates (fallback for webhook failures)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const pollInterval = setInterval(() => {
      // Only poll if we haven't received a webhook recently
      const lastUpdate = localStorage.getItem("lastSubscriptionUpdate");
      const now = Date.now();

      if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
        // 5 minutes
        console.log("Polling for subscription updates...");
        initializeSubscription();
        localStorage.setItem("lastSubscriptionUpdate", now.toString());
      }
    }, 10 * 60 * 1000); // Poll every 10 minutes

    return () => clearInterval(pollInterval);
  }, [isAuthenticated, user, initializeSubscription]);

  return <>{children}</>;
};
