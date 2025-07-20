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
} from "../config/subscriptionPlans";
import { useAuthStore } from "./authStore";
import { useSidePanelStore } from "./sidePanelStore";

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

  checkFeatureAccess: (feature) => {
    const { currentPlan } = get();
    if (!currentPlan) return false;

    switch (feature) {
      case "cloudStorage":
        return currentPlan.cloudStorage;
      case "exportFeatures":
        return currentPlan.priority !== "free";
      case "advancedAnalytics":
        return (
          currentPlan.priority === "pro" ||
          currentPlan.priority === "enterprise"
        );
      case "prioritySupport":
        return (
          currentPlan.priority === "pro" ||
          currentPlan.priority === "enterprise"
        );
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
      advancedAnalytics:
        plan.priority === "pro" || plan.priority === "enterprise",
      prioritySupport:
        plan.priority === "pro" || plan.priority === "enterprise",
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

      // Save to cloud storage if available
      if (get().checkFeatureAccess("cloudStorage")) {
        // TODO: Save to Firestore
        console.log("Saving usage metrics to cloud storage");
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

    if (plan.maxFolders === -1 && plan.maxChatsPerFolder === -1) {
      return { canCreateFolder: true, canAddChat: true };
    }

    const currentFolders = usageMetrics?.foldersCount || 0;
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

      // TODO: Call your backend API to create Stripe checkout session
      // For now, we'll simulate this
      console.log("Creating checkout session for plan:", planId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return a mock checkout URL
      const checkoutUrl = `https://checkout.stripe.com/pay/cs_test_${planId}#fidkdXx0YmxSdDd`;

      set({ isLoading: false });
      return checkoutUrl;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      set({ error: "Failed to create checkout session", isLoading: false });
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

      // TODO: Call your backend API to cancel subscription
      console.log("Canceling subscription:", userSubscription.id);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state
      set({
        userSubscription: { ...userSubscription, cancelAtPeriodEnd: true },
        currentPlan: SUBSCRIPTION_PLANS.FREE,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      set({ error: "Failed to cancel subscription", isLoading: false });
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

      // TODO: Call your backend API to reactivate subscription
      console.log("Reactivating subscription:", userSubscription.id);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state
      set({
        userSubscription: { ...userSubscription, cancelAtPeriodEnd: false },
        isLoading: false,
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      set({ error: "Failed to reactivate subscription", isLoading: false });
      throw error;
    }
  },

  initializeSubscription: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      set({ isLoading: true, error: null });

      // TODO: Fetch user subscription from backend/Firestore
      console.log("Initializing subscription for user:", authStore.user.uid);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, set default free plan
      set({
        currentPlan: SUBSCRIPTION_PLANS.FREE,
        userSubscription: null,
        isLoading: false,
      });

      // Update usage metrics
      await get().updateUsageMetrics();
    } catch (error) {
      console.error("Error initializing subscription:", error);
      set({ error: "Failed to initialize subscription", isLoading: false });
    }
  },
}));
