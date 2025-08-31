require("dotenv").config();

const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

// Initialize Firebase Admin
let serviceAccount;
try {
  // Try to parse as JSON (if it's a full service account JSON)
  serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
} catch (error) {
  // If parsing fails, use individual environment variables
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  };
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

// Middleware - IMPORTANT: Configure body parsing correctly for Stripe webhooks
app.use(cors({ origin: true }));

// Parse JSON bodies for all routes EXCEPT webhooks
app.use((req, res, next) => {
  if (req.originalUrl === "/webhooks/stripe") {
    // For Stripe webhooks, use raw body
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    // For all other routes, use JSON parsing
    express.json()(req, res, next);
  }
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          message: "No token provided",
          code: "UNAUTHORIZED",
          status: 401,
        },
      });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      error: {
        message: "Invalid token",
        code: "UNAUTHORIZED",
        status: 401,
      },
    });
  }
};

// Public health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Backend server is running",
  });
});

// Protected health check endpoint
app.get("/api/health", authenticateUser, (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    user: req.user.uid,
    message: "Authentication successful",
  });
});

// Helper function to get or create Stripe customer
async function getOrCreateCustomer(userId, email) {
  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        firebase_uid: userId,
      },
    });

    return customer;
  } catch (error) {
    console.error("Error getting/creating customer:", error);
    throw error;
  }
}

// Helper function to create default free subscription
async function createDefaultSubscription(userId) {
  try {
    const defaultSubscription = {
      userId: userId,
      planId: "free",
      status: "active",
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .set(defaultSubscription);
    return defaultSubscription;
  } catch (error) {
    console.error("Error creating default subscription:", error);
    throw error;
  }
}

// Subscription endpoints
app.get("/api/subscriptions/current", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get subscription from Firebase
    const subscriptionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .get();

    if (subscriptionDoc.exists) {
      const subscription = {
        id: subscriptionDoc.id,
        ...subscriptionDoc.data(),
      };
      res.json(subscription);
    } else {
      // Create default free subscription
      const defaultSubscription = await createDefaultSubscription(userId);
      res.json(defaultSubscription);
    }
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch subscription",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

app.post("/api/subscriptions/checkout", authenticateUser, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.uid;

    if (!planId) {
      return res.status(400).json({
        error: {
          message: "Plan ID is required",
          code: "INVALID_REQUEST",
          status: 400,
        },
      });
    }

    // Define plan prices (in cents)
    const planPrices = {
      free: 0,
      paid: 999, // $9.99
    };

    const price = planPrices[planId];
    if (!price && planId !== "free") {
      return res.status(400).json({
        error: {
          message: "Invalid plan ID",
          code: "PLAN_NOT_FOUND",
          status: 400,
        },
      });
    }

    // For free plan, just update the subscription directly
    if (planId === "free") {
      // Create a free subscription in Firebase
      const freeSubscription = {
        userId: req.user.uid,
        planId: "free",
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await db
          .collection("users")
          .doc(req.user.uid)
          .collection("subscription")
          .doc("current")
          .set(freeSubscription);

        console.log(`✅ Created free subscription for user ${req.user.uid}`);
      } catch (error) {
        console.error(`❌ Error creating free subscription:`, error);
        return res
          .status(500)
          .json({ error: "Failed to create free subscription" });
      }

      return res.json({
        id: "free_subscription",
        url: "chrome-extension://success",
        status: "completed",
      });
    }

    // For paid plan, create Stripe checkout session
    const customer = await getOrCreateCustomer(userId, req.user.email);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Pro Plan",
              description:
                "Unlimited folders, unlimited chats, and premium features",
            },
            unit_amount: 999, // $9.99 in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        "chrome-extension://success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "chrome-extension://cancel",
      metadata: {
        firebase_uid: req.user.uid, // Add Firebase user ID to metadata
        plan_id: "paid", // Add plan ID to metadata
      },
      subscription_data: {
        metadata: {
          firebase_uid: req.user.uid, // Also add to subscription metadata
          plan_id: "paid", // Add plan ID to subscription metadata
        },
      },
    });

    res.json({
      id: session.id,
      url: session.url,
      status: "open",
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: {
        message: "Failed to create checkout session",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

app.post("/api/subscriptions/cancel", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get current subscription
    const subscriptionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        error: {
          message: "No subscription found",
          code: "SUBSCRIPTION_NOT_FOUND",
          status: 404,
        },
      });
    }

    const subscription = subscriptionDoc.data();

    // If it's a Stripe subscription, cancel it
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update subscription status in Firebase
    await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .update({
        status: "canceled",
        cancelAtPeriodEnd: true,
        updatedAt: Date.now(),
      });

    res.json({
      success: true,
      message: "Subscription will be canceled at the end of the current period",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({
      error: {
        message: "Failed to cancel subscription",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

app.post(
  "/api/subscriptions/reactivate",
  authenticateUser,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      // Get current subscription
      const subscriptionDoc = await db
        .collection("users")
        .doc(userId)
        .collection("subscription")
        .doc("current")
        .get();

      if (!subscriptionDoc.exists) {
        return res.status(404).json({
          error: {
            message: "No subscription found",
            code: "SUBSCRIPTION_NOT_FOUND",
            status: 404,
          },
        });
      }

      const subscription = subscriptionDoc.data();

      // If it's a Stripe subscription, reactivate it
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      }

      // Update subscription status in Firebase
      await db
        .collection("users")
        .doc(userId)
        .collection("subscription")
        .doc("current")
        .update({
          status: "active",
          cancelAtPeriodEnd: false,
          updatedAt: Date.now(),
        });

      res.json({
        success: true,
        message: "Subscription reactivated successfully",
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({
        error: {
          message: "Failed to reactivate subscription",
          code: "INTERNAL_ERROR",
          status: 500,
        },
      });
    }
  }
);

// Usage metrics endpoints
app.get("/api/subscriptions/usage", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get usage metrics from Firebase
    const metricsDoc = await db
      .collection("users")
      .doc(userId)
      .collection("usage")
      .doc("metrics")
      .get();

    if (metricsDoc.exists) {
      const metrics = { userId, ...metricsDoc.data() };
      res.json(metrics);
    } else {
      // Return default metrics
      const defaultMetrics = {
        userId: userId,
        foldersCount: 0,
        totalChatsCount: 0,
        storageUsed: 0,
        lastUpdated: Date.now(),
      };
      res.json(defaultMetrics);
    }
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch usage metrics",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

app.put("/api/subscriptions/usage", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const metrics = req.body;

    // Save usage metrics to Firebase
    await db
      .collection("users")
      .doc(userId)
      .collection("usage")
      .doc("metrics")
      .set({
        ...metrics,
        userId: userId,
        lastUpdated: Date.now(),
      });

    res.json({
      success: true,
      message: "Usage metrics updated successfully",
    });
  } catch (error) {
    console.error("Error updating usage metrics:", error);
    res.status(500).json({
      error: {
        message: "Failed to update usage metrics",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

// Simple webhook test endpoint
app.get("/webhooks/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    headers: req.headers,
  });
});

// Stripe webhook endpoint
app.post("/webhooks/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`🔔 Received Stripe webhook: ${event.type}`);
    console.log(`📋 Event data:`, JSON.stringify(event.data.object, null, 2));

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscription = event.data.object;
        const firebaseUid = subscription.metadata?.firebase_uid;

        console.log(
          `👤 Processing subscription for user: ${firebaseUid || "undefined"}`
        );
        console.log(`📦 Subscription status: ${subscription.status}`);
        console.log(`💳 Customer ID: ${subscription.customer}`);
        console.log(`🔍 Available subscription fields:`, {
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created: subscription.created,
          status: subscription.status,
          id: subscription.id,
        });

        if (!firebaseUid) {
          console.log(`⚠️ No firebase_uid found in subscription metadata`);
          console.log(`📋 Available metadata:`, subscription.metadata);
          return res.json({ received: true });
        }

        // Calculate period dates with better fallbacks
        const currentTime = Date.now();
        const startTime = subscription.current_period_start
          ? subscription.current_period_start * 1000
          : currentTime;
        const endTime = subscription.current_period_end
          ? subscription.current_period_end * 1000
          : currentTime + 30 * 24 * 60 * 60 * 1000; // 30 days from now

        console.log(`📅 Calculated dates:`, {
          startTime,
          endTime,
          isValidStart: !isNaN(startTime),
          isValidEnd: !isNaN(endTime),
        });

        const subscriptionData = {
          userId: firebaseUid,
          planId: "paid",
          status: subscription.status,
          currentPeriodStart: isNaN(startTime) ? currentTime : startTime,
          currentPeriodEnd: isNaN(endTime)
            ? currentTime + 30 * 24 * 60 * 60 * 1000
            : endTime,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          createdAt: subscription.created
            ? subscription.created * 1000
            : currentTime,
          updatedAt: currentTime,
        };

        try {
          await db
            .collection("users")
            .doc(firebaseUid)
            .collection("subscription")
            .doc("current")
            .set(subscriptionData);

          console.log(
            `✅ Successfully updated subscription for user ${firebaseUid}: ${subscription.status}`
          );
          console.log(
            `📋 Saved subscription data:`,
            JSON.stringify(subscriptionData, null, 2)
          );
        } catch (error) {
          console.error(
            `❌ Error updating subscription for user ${firebaseUid}:`,
            error
          );
        }
        break;

      case "checkout.session.completed":
        const session = event.data.object;
        const sessionUserId = session.metadata.firebase_uid;

        console.log(
          `💳 Processing checkout completion for user: ${sessionUserId}`
        );
        console.log(`🛒 Session mode: ${session.mode}`);

        if (sessionUserId && session.mode === "subscription") {
          try {
            // Get the subscription details
            const subscriptionDetails = await stripe.subscriptions.retrieve(
              session.subscription
            );

            console.log(
              `📋 Retrieved subscription details:`,
              JSON.stringify(subscriptionDetails, null, 2)
            );

            // Calculate period dates with better fallbacks
            const currentTime = Date.now();
            const startTime = subscriptionDetails.current_period_start
              ? subscriptionDetails.current_period_start * 1000
              : currentTime;
            const endTime = subscriptionDetails.current_period_end
              ? subscriptionDetails.current_period_end * 1000
              : currentTime + 30 * 24 * 60 * 60 * 1000; // 30 days from now

            console.log(`📅 Checkout session calculated dates:`, {
              startTime,
              endTime,
              isValidStart: !isNaN(startTime),
              isValidEnd: !isNaN(endTime),
            });

            // Update Firebase with subscription data
            const subscriptionData = {
              userId: sessionUserId,
              planId: session.metadata.plan_id || "paid",
              status: subscriptionDetails.status,
              currentPeriodStart: isNaN(startTime) ? currentTime : startTime,
              currentPeriodEnd: isNaN(endTime)
                ? currentTime + 30 * 24 * 60 * 60 * 1000
                : endTime,
              cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end,
              stripeCustomerId: subscriptionDetails.customer,
              stripeSubscriptionId: subscriptionDetails.id,
              createdAt: subscriptionDetails.created
                ? subscriptionDetails.created * 1000
                : currentTime,
              updatedAt: currentTime,
            };

            console.log(
              `💾 Saving checkout session data to Firebase:`,
              JSON.stringify(subscriptionData, null, 2)
            );

            await db
              .collection("users")
              .doc(sessionUserId)
              .collection("subscription")
              .doc("current")
              .set(subscriptionData);

            console.log(
              `✅ Successfully processed checkout for user ${sessionUserId}: ${session.metadata.plan_id}`
            );
          } catch (error) {
            console.error(
              `❌ Error processing checkout for user ${sessionUserId}:`,
              error
            );
          }
        } else {
          console.warn(
            `⚠️ Invalid checkout session: userId=${sessionUserId}, mode=${session.mode}`
          );
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Additional subscription endpoints
app.get("/api/subscriptions/plans", (req, res) => {
  res.json({
    plans: [
      {
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
      {
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
        maxFolders: -1,
        maxChatsPerFolder: -1,
        cloudStorage: true,
        priority: "paid",
      },
    ],
  });
});

app.get("/api/subscriptions/billing", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get subscription from Firebase
    const subscriptionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .get();

    if (!subscriptionDoc.exists || !subscriptionDoc.data().stripeCustomerId) {
      return res.json([]);
    }

    const subscription = subscriptionDoc.data();

    // Get billing history from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    });

    const billingHistory = invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      description: invoice.description || "Subscription payment",
      invoiceUrl: invoice.hosted_invoice_url,
    }));

    res.json(billingHistory);
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch billing history",
        code: "INTERNAL_ERROR",
        status: 500,
      },
    });
  }
});

app.get(
  "/api/subscriptions/payment-methods",
  authenticateUser,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      // Get subscription from Firebase
      const subscriptionDoc = await db
        .collection("users")
        .doc(userId)
        .collection("subscription")
        .doc("current")
        .get();

      if (!subscriptionDoc.exists || !subscriptionDoc.data().stripeCustomerId) {
        return res.json([]);
      }

      const subscription = subscriptionDoc.data();

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripeCustomerId,
        type: "card",
      });

      const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        last4: pm.card.last4,
        brand: pm.card.brand,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: pm.id === subscription.default_payment_method,
      }));

      res.json(formattedPaymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({
        error: {
          message: "Failed to fetch payment methods",
          code: "INTERNAL_ERROR",
          status: 500,
        },
      });
    }
  }
);

app.put(
  "/api/subscriptions/payment-method",
  authenticateUser,
  async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user.uid;

      // Get subscription from Firebase
      const subscriptionDoc = await db
        .collection("users")
        .doc(userId)
        .collection("subscription")
        .doc("current")
        .get();

      if (
        !subscriptionDoc.exists ||
        !subscriptionDoc.data().stripeSubscriptionId
      ) {
        return res.status(404).json({
          error: {
            message: "No active subscription found",
            code: "SUBSCRIPTION_NOT_FOUND",
            status: 404,
          },
        });
      }

      const subscription = subscriptionDoc.data();

      // Update default payment method in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });

      res.json({
        success: true,
        message: "Payment method updated successfully",
      });
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({
        error: {
          message: "Failed to update payment method",
          code: "INTERNAL_ERROR",
          status: 500,
        },
      });
    }
  }
);

// Payment verification endpoint
app.post(
  "/api/subscriptions/verify-payment",
  authenticateUser,
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const userId = req.user.uid;

      if (!sessionId) {
        return res.status(400).json({
          error: {
            message: "Session ID is required",
            code: "INVALID_REQUEST",
            status: 400,
          },
        });
      }

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({
          error: {
            message: "Payment not completed",
            code: "PAYMENT_INCOMPLETE",
            status: 400,
          },
        });
      }

      // If the session has a subscription, retrieve it
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        console.log(`🔍 Payment verification subscription details:`, {
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created: subscription.created,
          status: subscription.status,
          id: subscription.id,
        });

        // Calculate period dates with better fallbacks
        const currentTime = Date.now();
        const startTime = subscription.current_period_start
          ? subscription.current_period_start * 1000
          : currentTime;
        const endTime = subscription.current_period_end
          ? subscription.current_period_end * 1000
          : currentTime + 30 * 24 * 60 * 60 * 1000; // 30 days from now

        console.log(`📅 Payment verification calculated dates:`, {
          startTime,
          endTime,
          isValidStart: !isNaN(startTime),
          isValidEnd: !isNaN(endTime),
        });

        // Update Firebase with subscription data
        await db
          .collection("users")
          .doc(userId)
          .collection("subscription")
          .doc("current")
          .set({
            userId: userId,
            planId: session.metadata.plan_id || "paid",
            status: subscription.status,
            currentPeriodStart: isNaN(startTime) ? currentTime : startTime,
            currentPeriodEnd: isNaN(endTime)
              ? currentTime + 30 * 24 * 60 * 60 * 1000
              : endTime,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            createdAt: subscription.created
              ? subscription.created * 1000
              : currentTime,
            updatedAt: currentTime,
          });

        console.log(
          `Payment verified for user ${userId}: ${session.metadata.plan_id}`
        );
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        error: {
          message: "Failed to verify payment",
          code: "INTERNAL_ERROR",
          status: 500,
        },
      });
    }
  }
);

// Test endpoint to manually trigger webhook events (for debugging)
app.post("/api/test/webhook", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { eventType } = req.body;

    console.log(`🧪 Testing webhook event: ${eventType} for user: ${userId}`);

    // Create a test subscription in Firebase
    const testSubscription = {
      userId: userId,
      planId: "paid",
      status: "active",
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      stripeCustomerId: "cus_test_123",
      stripeSubscriptionId: "sub_test_123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .set(testSubscription);

    // Also create test usage metrics
    const testUsageMetrics = {
      userId: userId,
      foldersCount: 2,
      totalChatsCount: 15,
      storageUsed: 1024000,
      lastUpdated: Date.now(),
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("usage")
      .doc("metrics")
      .set(testUsageMetrics);

    console.log(
      `✅ Test subscription and usage metrics created for user ${userId}`
    );

    res.json({
      success: true,
      message: `Test ${eventType} event processed for user ${userId}`,
      subscription: testSubscription,
      usageMetrics: testUsageMetrics,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({
      error: {
        message: "Failed to process test webhook",
        code: "TEST_ERROR",
        status: 500,
      },
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
