import { SubscriptionPlan, SubscriptionTier } from "../types/subscription";

export const SUBSCRIPTION_PLANS: SubscriptionTier = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: [
      "3 folders",
      "10 chats per folder",
      "Cloud storage",
      "Basic support",
    ],
    maxFolders: 3,
    maxChatsPerFolder: 10,
    cloudStorage: true,
    priority: "free",
  },
  PAID: {
    id: "paid",
    name: "Pro",
    price: 9.99,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited folders",
      "Unlimited chats per folder",
      "Cloud storage",
      "Prompts navigation",
      "Print to PDF",
      "Priority support",
    ],
    maxFolders: -1, // unlimited
    maxChatsPerFolder: -1, // unlimited
    cloudStorage: true,
    priority: "paid",
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
