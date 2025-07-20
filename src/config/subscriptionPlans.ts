import { SubscriptionPlan, SubscriptionTier } from "../types/subscription";

export const SUBSCRIPTION_PLANS: SubscriptionTier = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: [
      "Up to 3 folders",
      "Up to 10 chats per folder",
      "Local storage only",
      "Basic support",
    ],
    maxFolders: 3,
    maxChatsPerFolder: 10,
    cloudStorage: false,
    priority: "free",
  },
  BASIC: {
    id: "basic",
    name: "Basic",
    price: 4.99,
    currency: "USD",
    interval: "month",
    features: [
      "Up to 10 folders",
      "Up to 50 chats per folder",
      "Cloud storage",
      "Export features",
      "Email support",
    ],
    maxFolders: 10,
    maxChatsPerFolder: 50,
    cloudStorage: true,
    priority: "basic",
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 9.99,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited folders",
      "Unlimited chats per folder",
      "Cloud storage",
      "Export features",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
    ],
    maxFolders: -1, // unlimited
    maxChatsPerFolder: -1, // unlimited
    cloudStorage: true,
    priority: "pro",
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 29.99,
    currency: "USD",
    interval: "month",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
      "Advanced security",
      "Custom branding",
    ],
    maxFolders: -1, // unlimited
    maxChatsPerFolder: -1, // unlimited
    cloudStorage: true,
    priority: "enterprise",
  },
};

export const getPlanById = (planId: string): SubscriptionPlan | null => {
  const plans = Object.values(SUBSCRIPTION_PLANS);
  return plans.find((plan) => plan.id === planId) || null;
};

export const getPlanByPriority = (
  priority: string
): SubscriptionPlan | null => {
  const plans = Object.values(SUBSCRIPTION_PLANS);
  return plans.find((plan) => plan.priority === priority) || null;
};

export const getDefaultPlan = (): SubscriptionPlan => {
  return SUBSCRIPTION_PLANS.FREE;
};
