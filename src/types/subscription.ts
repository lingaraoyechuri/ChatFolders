export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  maxFolders: number;
  maxChatsPerFolder: number;
  cloudStorage: boolean;
  priority: "free" | "paid";
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  userId: string;
  foldersCount: number;
  totalChatsCount: number;
  storageUsed: number; // in bytes
  lastUpdated: Date;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  status: "open" | "complete" | "expired";
}

export interface SubscriptionTier {
  FREE: SubscriptionPlan;
  PAID: SubscriptionPlan;
}

export interface FeatureLimits {
  maxFolders: number;
  maxChatsPerFolder: number;
  cloudStorage: boolean;
  exportFeatures: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionState {
  currentPlan: SubscriptionPlan | null;
  userSubscription: UserSubscription | null;
  usageMetrics: UsageMetrics | null;
  isLoading: boolean;
  error: string | null;
}
