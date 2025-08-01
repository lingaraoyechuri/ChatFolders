// Load environment variables first
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

// Middleware
app.use((req, res, next) => {
  console.log("Request origin:", req.headers.origin);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);
  next();
});

// CORS configuration
app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());

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

// Apply authentication to all routes
app.use("/api", authenticateUser);

// Health check endpoint (no authentication required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API health check endpoint (requires authentication)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    user: req.user.uid,
    message: "Authentication successful",
  });
});

// Subscription endpoints
app.get("/api/subscriptions/current", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would fetch from your database
    // For demo purposes, we'll return a mock subscription
    const subscription = {
      id: "sub_1234567890",
      userId: userId,
      planId: "free",
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      cancelAtPeriodEnd: false,
      stripeCustomerId: "cus_1234567890",
      stripeSubscriptionId: "sub_1234567890",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json(subscription);
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

app.post("/api/subscriptions/checkout", async (req, res) => {
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
      paid: 999,
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

    // Create or get Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: req.user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          firebase_uid: userId,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
            },
            unit_amount: price,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        firebase_uid: userId,
        plan_id: planId,
      },
    });

    res.json({
      id: session.id,
      url: session.url,
      status: session.status,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: {
        message: "Failed to create checkout session",
        code: "PAYMENT_FAILED",
        status: 500,
      },
    });
  }
});

app.post("/api/subscriptions/cancel", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would fetch the subscription from your database
    // and cancel it in Stripe
    console.log(`Canceling subscription for user: ${userId}`);

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

app.post("/api/subscriptions/reactivate", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would reactivate the subscription
    console.log(`Reactivating subscription for user: ${userId}`);

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
});

// Usage metrics endpoints
app.get("/api/subscriptions/usage", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would fetch from your database
    const usage = {
      userId: userId,
      foldersCount: 3,
      totalChatsCount: 15,
      storageUsed: 512000,
      lastUpdated: new Date().toISOString(),
    };

    res.json(usage);
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

app.put("/api/subscriptions/usage", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { foldersCount, totalChatsCount, storageUsed } = req.body;

    // In a real implementation, you would save to your database
    const usage = {
      userId: userId,
      foldersCount: foldersCount || 0,
      totalChatsCount: totalChatsCount || 0,
      storageUsed: storageUsed || 0,
      lastUpdated: new Date().toISOString(),
    };

    res.json(usage);
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

// Billing endpoints
app.get("/api/subscriptions/billing", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would fetch from Stripe
    const billingHistory = [
      {
        id: "in_1234567890",
        amount: 999,
        currency: "usd",
        status: "paid",
        date: new Date().toISOString(),
        description: "Pro Plan - January 2024",
        invoiceUrl:
          "https://invoice.stripe.com/i/acct_1234567890/test_YWNjdF8xMjM0NTY3ODkwLF9Qcm9qZWN0XzEyMzQ1Njc4OTAsX0ludm9pY2VfMTIzNDU2Nzg5MCw_00",
      },
    ];

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

app.get("/api/subscriptions/payment-methods", async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real implementation, you would fetch from Stripe
    const paymentMethods = [
      {
        id: "pm_1234567890",
        type: "card",
        last4: "4242",
        brand: "visa",
        expMonth: 12,
        expYear: 2025,
        isDefault: true,
      },
    ];

    res.json(paymentMethods);
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
});

app.put("/api/subscriptions/payment-method", async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.uid;

    if (!paymentMethodId) {
      return res.status(400).json({
        error: {
          message: "Payment method ID is required",
          code: "INVALID_REQUEST",
          status: 400,
        },
      });
    }

    // In a real implementation, you would update the default payment method in Stripe
    console.log(
      `Updating payment method for user: ${userId}, payment method: ${paymentMethodId}`
    );

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
});

// Webhook endpoint
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log("Received webhook event:", event.type);

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          // Handle subscription changes
          const subscription = event.data.object;
          console.log("Subscription event:", event.type, subscription.id);
          break;

        case "invoice.payment_succeeded":
          // Handle successful payment
          const invoice = event.data.object;
          console.log("Payment succeeded:", invoice.id);
          break;

        case "invoice.payment_failed":
          // Handle failed payment
          const failedInvoice = event.data.object;
          console.log("Payment failed:", failedInvoice.id);
          break;

        default:
          console.log("Unhandled Stripe event:", event.type);
      }

      res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({
        error: {
          message: "Webhook processing failed",
          code: "WEBHOOK_ERROR",
          status: 400,
        },
      });
    }
  }
);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
