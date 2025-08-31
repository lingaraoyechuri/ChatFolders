import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { UserSubscription, UsageMetrics } from "../types/subscription";

export class SubscriptionService {
  private static instance: SubscriptionService;
  private unsubscribeFunctions: (() => void)[] = [];

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // Get user subscription from Firebase
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionRef = doc(
        db,
        "users",
        userId,
        "subscription",
        "current"
      );
      const subscriptionDoc = await getDoc(subscriptionRef);

      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data();

        // Convert number timestamps to JavaScript Date objects
        const subscription: UserSubscription = {
          id: subscriptionDoc.id,
          userId: data.userId,
          planId: data.planId,
          status: data.status,
          currentPeriodStart: new Date(data.currentPeriodStart),
          currentPeriodEnd: new Date(data.currentPeriodEnd),
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };

        console.log(
          `📋 Fetched subscription for user ${userId}:`,
          subscription
        );
        return subscription;
      }

      return null;
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      throw error;
    }
  }

  // Save subscription to Firebase
  async saveUserSubscription(
    userId: string,
    subscription: UserSubscription
  ): Promise<void> {
    try {
      const subscriptionRef = doc(
        db,
        "users",
        userId,
        "subscription",
        "current"
      );
      await setDoc(subscriptionRef, {
        ...subscription,
        updatedAt: Date.now(),
      });
      console.log(
        `Saved subscription for user ${userId}:`,
        subscription.planId
      );
    } catch (error) {
      console.error("Error saving user subscription:", error);
      throw error;
    }
  }

  // Update subscription status
  async updateSubscriptionStatus(
    userId: string,
    status: string
  ): Promise<void> {
    try {
      const subscriptionRef = doc(
        db,
        "users",
        userId,
        "subscription",
        "current"
      );
      await updateDoc(subscriptionRef, {
        status,
        updatedAt: Date.now(),
      });
      console.log(`Updated subscription status for user ${userId}: ${status}`);
    } catch (error) {
      console.error("Error updating subscription status:", error);
      throw error;
    }
  }

  // Get usage metrics from Firebase
  async getUsageMetrics(userId: string): Promise<UsageMetrics | null> {
    try {
      const metricsRef = doc(db, "users", userId, "usage", "metrics");
      const metricsDoc = await getDoc(metricsRef);

      if (metricsDoc.exists()) {
        const data = metricsDoc.data();

        // Convert number timestamps to JavaScript Date objects
        const metrics: UsageMetrics = {
          userId: data.userId,
          foldersCount: data.foldersCount || 0,
          totalChatsCount: data.totalChatsCount || 0,
          storageUsed: data.storageUsed || 0,
          lastUpdated: new Date(data.lastUpdated),
        };

        console.log(`📊 Fetched usage metrics for user ${userId}:`, metrics);
        return metrics;
      }

      return null;
    } catch (error) {
      console.error("Error fetching usage metrics:", error);
      throw error;
    }
  }

  // Save usage metrics to Firebase
  async saveUsageMetrics(userId: string, metrics: UsageMetrics): Promise<void> {
    try {
      const metricsRef = doc(db, "users", userId, "usage", "metrics");
      await setDoc(metricsRef, {
        ...metrics,
        lastUpdated: Date.now(),
      });
      console.log(`Saved usage metrics for user ${userId}:`, {
        foldersCount: metrics.foldersCount,
        totalChatsCount: metrics.totalChatsCount,
      });
    } catch (error) {
      console.error("Error saving usage metrics:", error);
      throw error;
    }
  }

  // Set up real-time listener for subscription changes
  setupSubscriptionListener(
    userId: string,
    callback: (subscription: UserSubscription | null) => void
  ): () => void {
    try {
      const subscriptionRef = doc(
        db,
        "users",
        userId,
        "subscription",
        "current"
      );

      const unsubscribe = onSnapshot(
        subscriptionRef,
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();

            // Convert number timestamps to JavaScript Date objects
            const subscription: UserSubscription = {
              id: doc.id,
              userId: data.userId,
              planId: data.planId,
              status: data.status,
              currentPeriodStart: new Date(data.currentPeriodStart),
              currentPeriodEnd: new Date(data.currentPeriodEnd),
              cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
              stripeCustomerId: data.stripeCustomerId,
              stripeSubscriptionId: data.stripeSubscriptionId,
              createdAt: new Date(data.createdAt),
              updatedAt: new Date(data.updatedAt),
            };

            console.log(
              `📋 Subscription updated for user ${userId}:`,
              subscription.planId,
              subscription.status
            );
            callback(subscription);
          } else {
            console.log(`No subscription found for user ${userId}`);
            callback(null);
          }
        },
        (error) => {
          console.error("Error in subscription listener:", error);
          callback(null);
        }
      );

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up subscription listener:", error);
      return () => {};
    }
  }

  // Set up real-time listener for usage metrics changes
  setupUsageListener(
    userId: string,
    callback: (metrics: UsageMetrics | null) => void
  ): () => void {
    try {
      const metricsRef = doc(db, "users", userId, "usage", "metrics");

      const unsubscribe = onSnapshot(
        metricsRef,
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();

            // Convert number timestamps to JavaScript Date objects
            const metrics: UsageMetrics = {
              userId: data.userId,
              foldersCount: data.foldersCount || 0,
              totalChatsCount: data.totalChatsCount || 0,
              storageUsed: data.storageUsed || 0,
              lastUpdated: new Date(data.lastUpdated),
            };

            console.log(`📊 Usage metrics updated for user ${userId}:`, {
              foldersCount: metrics.foldersCount,
              totalChatsCount: metrics.totalChatsCount,
            });
            callback(metrics);
          } else {
            console.log(`No usage metrics found for user ${userId}`);
            callback(null);
          }
        },
        (error) => {
          console.error("Error in usage listener:", error);
          callback(null);
        }
      );

      this.unsubscribeFunctions.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up usage listener:", error);
      return () => {};
    }
  }

  // Clean up all listeners
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance();
