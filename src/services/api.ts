import {
  UserSubscription,
  UsageMetrics,
  StripeCheckoutSession,
} from "../types/subscription";

// API Configuration
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-backend-api.com/api"
    : "http://localhost:3001/api";

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  // Get Firebase auth token
  const { getAuth } = await import("firebase/auth");
  const { auth } = await import("../config/firebase");
  const user = auth.currentUser;
  return user ? await user.getIdToken() : null;
};

// Helper function for API calls
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API call failed: ${response.status}`);
  }

  return response.json();
};

// Subscription API endpoints
export const subscriptionAPI = {
  // Get user subscription
  getUserSubscription: async (): Promise<UserSubscription | null> => {
    return apiCall<UserSubscription | null>("/subscriptions/current");
  },

  // Create Stripe checkout session
  createCheckoutSession: async (
    planId: string
  ): Promise<StripeCheckoutSession> => {
    return apiCall<StripeCheckoutSession>("/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
  },

  // Cancel subscription
  cancelSubscription: async (): Promise<void> => {
    return apiCall<void>("/subscriptions/cancel", {
      method: "POST",
    });
  },

  // Reactivate subscription
  reactivateSubscription: async (): Promise<void> => {
    return apiCall<void>("/subscriptions/reactivate", {
      method: "POST",
    });
  },

  // Get usage metrics
  getUsageMetrics: async (): Promise<UsageMetrics> => {
    return apiCall<UsageMetrics>("/subscriptions/usage");
  },

  // Update usage metrics
  updateUsageMetrics: async (
    metrics: Partial<UsageMetrics>
  ): Promise<UsageMetrics> => {
    return apiCall<UsageMetrics>("/subscriptions/usage", {
      method: "PUT",
      body: JSON.stringify(metrics),
    });
  },

  // Get subscription plans
  getSubscriptionPlans: async () => {
    return apiCall("/subscriptions/plans");
  },

  // Get billing history
  getBillingHistory: async () => {
    return apiCall("/subscriptions/billing");
  },

  // Update payment method
  updatePaymentMethod: async (paymentMethodId: string) => {
    return apiCall("/subscriptions/payment-method", {
      method: "PUT",
      body: JSON.stringify({ paymentMethodId }),
    });
  },
};

// Webhook handling for Stripe events
export const webhookAPI = {
  // Handle Stripe webhook events
  handleWebhook: async (event: any) => {
    return apiCall("/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },
};

// Error handling utilities
export class APIError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "APIError";
  }
}

// Retry logic for failed API calls
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries - 1) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }

  throw lastError!;
};
