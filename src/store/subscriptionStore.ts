import { create } from "zustand";
import {
  SubscriptionState,
  UserSubscription,
  UsageMetrics,
  SubscriptionPlan,
  FeatureLimits,
} from "../types/subscription";
import {
  SUBSCRIPTION_PLANS,
  getDefaultPlan,
  getPlanById,
} from "../config/subscriptionPlans";
import { useAuthStore } from "./authStore";
import { useSidePanelStore } from "./sidePanelStore";
import { subscriptionAPI, withRetry } from "../services/api";
import { subscriptionService } from "../services/subscriptionService";

interface SubscriptionActions {
  // Subscription management
  setCurrentPlan: (plan: SubscriptionPlan) => void;
  setUserSubscription: (subscription: UserSubscription | null) => void;
  setUsageMetrics: (metrics: UsageMetrics | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Feature gating
  checkFeatureAccess: (feature: keyof FeatureLimits) => boolean;
  getFeatureLimits: () => FeatureLimits;
  isFeatureGated: () => boolean;

  // Usage tracking
  updateUsageMetrics: () => Promise<void>;
  checkUsageLimits: () => {
    canCreateFolder: boolean;
    canAddChat: (folderId: string) => boolean;
  };

  // Subscription actions
  createCheckoutSession: (planId: string) => Promise<string>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;

  // Initialize subscription
  initializeSubscription: () => Promise<void>;

  // Real-time listeners
  setupSubscriptionListener: () => void;
  setupUsageListener: () => void;
  cleanupListeners: () => void;
}

export const useSubscriptionStore = create<
  SubscriptionState & SubscriptionActions
>((set, get) => ({
  // State
  currentPlan: getDefaultPlan(),
  userSubscription: null,
  usageMetrics: null,
  isLoading: false,
  error: null,

  // Actions
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setUserSubscription: (subscription) =>
    set({ userSubscription: subscription }),
  setUsageMetrics: (metrics) => set({ usageMetrics: metrics }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  checkFeatureAccess: (feature: keyof FeatureLimits) => {
    const { currentPlan } = get();
    if (!currentPlan) return false;

    switch (feature) {
      case "cloudStorage":
        return currentPlan.cloudStorage;
      case "exportFeatures":
        return currentPlan.priority !== "free";
      case "advancedAnalytics":
        return currentPlan.priority === "paid";
      case "prioritySupport":
        return currentPlan.priority === "paid";
      default:
        return true;
    }
  },

  getFeatureLimits: () => {
    const { currentPlan } = get();
    const plan = currentPlan || getDefaultPlan();

    return {
      maxFolders: plan.maxFolders,
      maxChatsPerFolder: plan.maxChatsPerFolder,
      cloudStorage: plan.cloudStorage,
      exportFeatures: plan.priority !== "free",
      advancedAnalytics: plan.priority === "paid",
      prioritySupport: plan.priority === "paid",
    };
  },

  isFeatureGated: () => {
    const { currentPlan } = get();
    return currentPlan?.priority === "free";
  },

  updateUsageMetrics: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const sidePanelStore = useSidePanelStore.getState();
      const folders = sidePanelStore.folders;

      const metrics: UsageMetrics = {
        userId: authStore.user.uid,
        foldersCount: folders.length,
        totalChatsCount: folders.reduce(
          (total, folder) => total + folder.conversations.length,
          0
        ),
        storageUsed: JSON.stringify(folders).length,
        lastUpdated: new Date(),
      };

      set({ usageMetrics: metrics });

      // Save to backend API (which saves to Firebase)
      if (get().checkFeatureAccess("cloudStorage")) {
        try {
          await withRetry(() => subscriptionAPI.updateUsageMetrics(metrics));
          console.log("Usage metrics saved to backend");
        } catch (error) {
          console.error("Failed to save usage metrics to backend:", error);
        }
      }
    } catch (error) {
      console.error("Error updating usage metrics:", error);
      set({ error: "Failed to update usage metrics" });
    }
  },

  checkUsageLimits: () => {
    const { currentPlan } = get();
    const sidePanelStore = useSidePanelStore.getState();
    const folders = sidePanelStore.folders;

    const canCreateFolder =
      currentPlan?.maxFolders === -1 ||
      folders.length < (currentPlan?.maxFolders || 3);

    const canAddChat = (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return false;

      return (
        currentPlan?.maxChatsPerFolder === -1 ||
        folder.conversations.length < (currentPlan?.maxChatsPerFolder || 10)
      );
    };

    return { canCreateFolder, canAddChat };
  },

  createCheckoutSession: async (planId: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await withRetry(() =>
        subscriptionAPI.createCheckoutSession(planId)
      );

      if (response.url) {
        // For Chrome extension, open Stripe checkout in a new tab
        if (planId === "free") {
          // For free plan, just refresh subscription data
          await get().initializeSubscription();
          return "free_activated";
        } else {
          // For paid plan, open Stripe checkout in new tab
          // Use window.open instead of chrome.tabs.create for content script compatibility
          const newWindow = window.open(response.url, "_blank");
          if (!newWindow) {
            throw new Error(
              "Popup blocked. Please allow popups for this site."
            );
          }
          return response.url; // Return the checkout URL for manual opening if needed
        }
      }

      return response.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create checkout session";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelSubscription: async () => {
    try {
      set({ isLoading: true, error: null });

      await withRetry(() => subscriptionAPI.cancelSubscription());

      // Refresh subscription data
      await get().initializeSubscription();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  reactivateSubscription: async () => {
    try {
      set({ isLoading: true, error: null });

      await withRetry(() => subscriptionAPI.reactivateSubscription());

      // Refresh subscription data
      await get().initializeSubscription();
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to reactivate subscription";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  initializeSubscription: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      set({ isLoading: true, error: null });

      // Fetch user subscription from backend API (now connected to Firebase)
      const [userSubscription, usageMetrics] = await Promise.all([
        withRetry(() => subscriptionAPI.getUserSubscription()),
        withRetry(() => subscriptionAPI.getUsageMetrics()),
      ]);

      // Determine current plan based on subscription
      let currentPlan = SUBSCRIPTION_PLANS.FREE;
      if (userSubscription) {
        const plan = getPlanById(userSubscription.planId);
        if (plan) {
          currentPlan = plan;
        }
      }

      set({
        currentPlan,
        userSubscription,
        usageMetrics,
        isLoading: false,
      });

      // Set up real-time listeners for subscription changes
      get().setupSubscriptionListener();
      get().setupUsageListener();
    } catch (error) {
      console.error("Error initializing subscription:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize subscription",
        isLoading: false,
      });

      // Set default free plan on error
      set({
        currentPlan: SUBSCRIPTION_PLANS.FREE,
        userSubscription: null,
        usageMetrics: null,
      });
    }
  },

  setupSubscriptionListener: () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const unsubscribe = subscriptionService.setupSubscriptionListener(
        authStore.user.uid,
        (subscription) => {
          if (subscription) {
            const plan = getPlanById(subscription.planId);
            set({
              userSubscription: subscription,
              currentPlan: plan || SUBSCRIPTION_PLANS.FREE,
            });
            console.log(
              "Subscription updated via real-time listener:",
              subscription.planId
            );
          } else {
            set({
              userSubscription: null,
              currentPlan: SUBSCRIPTION_PLANS.FREE,
            });
            console.log("Subscription removed via real-time listener");
          }
        }
      );

      // Store unsubscribe function for cleanup (not in state)
      console.log("Subscription listener set up successfully");
    } catch (error) {
      console.error("Error setting up subscription listener:", error);
    }
  },

  setupUsageListener: () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const unsubscribe = subscriptionService.setupUsageListener(
        authStore.user.uid,
        (metrics) => {
          set({ usageMetrics: metrics });
          if (metrics) {
            console.log("Usage metrics updated via real-time listener:", {
              foldersCount: metrics.foldersCount,
              totalChatsCount: metrics.totalChatsCount,
            });
          } else {
            console.log("Usage metrics removed via real-time listener");
          }
        }
      );

      // Store unsubscribe function for cleanup (not in state)
      console.log("Usage listener set up successfully");
    } catch (error) {
      console.error("Error setting up usage listener:", error);
    }
  },

  cleanupListeners: () => {
    subscriptionService.cleanup();
    console.log("All listeners cleaned up");
  },
}));
