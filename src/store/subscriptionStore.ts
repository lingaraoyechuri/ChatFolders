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
  checkUsageLimits: () => { canCreateFolder: boolean; canAddChat: boolean };

  // Subscription actions
  createCheckoutSession: (planId: string) => Promise<string>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;

  // Initialize subscription
  initializeSubscription: () => Promise<void>;
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
      set({ isLoading: true });

      // Get current folders and chats from sidePanelStore
      const sidePanelStore = useSidePanelStore.getState();
      const folders = sidePanelStore.folders;

      const metrics: UsageMetrics = {
        userId: authStore.user.uid,
        foldersCount: folders.length,
        totalChatsCount: folders.reduce(
          (total, folder) => total + folder.conversations.length,
          0
        ),
        storageUsed: JSON.stringify(folders).length, // Simple size calculation
        lastUpdated: new Date(),
      };

      set({ usageMetrics: metrics });

      // Save to backend API if cloud storage is available
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
    } finally {
      set({ isLoading: false });
    }
  },

  checkUsageLimits: () => {
    const { currentPlan, usageMetrics } = get();
    const plan = currentPlan || getDefaultPlan();
    const authStore = useAuthStore.getState();

    if (plan.maxFolders === -1 && plan.maxChatsPerFolder === -1) {
      return { canCreateFolder: true, canAddChat: true };
    }

    // For unauthenticated users, check local storage folders
    let currentFolders = 0;
    if (!authStore.isAuthenticated) {
      // Get folders from local storage for unauthenticated users
      const sidePanelStore = useSidePanelStore.getState();
      currentFolders = sidePanelStore.folders.length;
    } else {
      // For authenticated users, use usageMetrics
      currentFolders = usageMetrics?.foldersCount || 0;
    }

    const canCreateFolder =
      plan.maxFolders === -1 || currentFolders < plan.maxFolders;

    // For chat limits, we need to check the current folder being used
    const sidePanelStore = useSidePanelStore.getState();
    const selectedFolder = sidePanelStore.selectedFolder;
    const currentChatsInFolder = selectedFolder?.conversations.length || 0;
    const canAddChat =
      plan.maxChatsPerFolder === -1 ||
      currentChatsInFolder < plan.maxChatsPerFolder;

    return { canCreateFolder, canAddChat };
  },

  createCheckoutSession: async (planId: string) => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      throw new Error("User must be authenticated to create checkout session");
    }

    try {
      set({ isLoading: true, error: null });

      // Call backend API to create Stripe checkout session
      const checkoutSession = await withRetry(() =>
        subscriptionAPI.createCheckoutSession(planId)
      );

      set({ isLoading: false });
      return checkoutSession.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
        isLoading: false,
      });
      throw error;
    }
  },

  cancelSubscription: async () => {
    const { userSubscription } = get();
    if (!userSubscription) {
      throw new Error("No active subscription to cancel");
    }

    try {
      set({ isLoading: true, error: null });

      // Call backend API to cancel subscription
      await withRetry(() => subscriptionAPI.cancelSubscription());

      // Update local state
      set({
        userSubscription: { ...userSubscription, cancelAtPeriodEnd: true },
        currentPlan: SUBSCRIPTION_PLANS.FREE,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription",
        isLoading: false,
      });
      throw error;
    }
  },

  reactivateSubscription: async () => {
    const { userSubscription } = get();
    if (!userSubscription) {
      throw new Error("No subscription to reactivate");
    }

    try {
      set({ isLoading: true, error: null });

      // Call backend API to reactivate subscription
      await withRetry(() => subscriptionAPI.reactivateSubscription());

      // Update local state
      set({
        userSubscription: { ...userSubscription, cancelAtPeriodEnd: false },
        isLoading: false,
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to reactivate subscription",
        isLoading: false,
      });
      throw error;
    }
  },

  initializeSubscription: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      set({ isLoading: true, error: null });

      // Fetch user subscription from backend API
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
}));
