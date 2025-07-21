import { loadStripe, Stripe } from "@stripe/stripe-js";

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY =
  process.env.NODE_ENV === "production"
    ? "pk_live_your_live_key_here"
    : "pk_test_your_test_key_here";

let stripeInstance: Stripe | null = null;

// Initialize Stripe
export const initializeStripe = async (): Promise<Stripe> => {
  if (stripeInstance) {
    return stripeInstance;
  }

  try {
    stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
    if (!stripeInstance) {
      throw new Error("Failed to load Stripe");
    }
    return stripeInstance;
  } catch (error) {
    console.error("Error initializing Stripe:", error);
    throw error;
  }
};

// Get Stripe instance
export const getStripe = (): Stripe | null => {
  return stripeInstance;
};

// Create payment method
export const createPaymentMethod = async (cardElement: any) => {
  const stripe = await initializeStripe();

  const { error, paymentMethod } = await stripe.createPaymentMethod({
    type: "card",
    card: cardElement,
  });

  if (error) {
    throw new Error(error.message);
  }

  return paymentMethod;
};

// Confirm payment intent
export const confirmPayment = async (
  clientSecret: string,
  paymentMethodId: string
) => {
  const stripe = await initializeStripe();

  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: paymentMethodId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return paymentIntent;
};

// Setup payment intent for subscription
export const setupPaymentIntent = async (
  clientSecret: string,
  paymentMethodId: string
) => {
  const stripe = await initializeStripe();

  const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
    payment_method: paymentMethodId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return setupIntent;
};

// Handle Stripe webhook events
export const handleStripeWebhook = (event: any) => {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Handle subscription changes
      console.log("Subscription event:", event.type, event.data.object);
      break;

    case "invoice.payment_succeeded":
      // Handle successful payment
      console.log("Payment succeeded:", event.data.object);
      break;

    case "invoice.payment_failed":
      // Handle failed payment
      console.log("Payment failed:", event.data.object);
      break;

    default:
      console.log("Unhandled Stripe event:", event.type);
  }
};

// Validate Stripe webhook signature
export const validateWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  // In a real implementation, you would use Stripe's webhook signature validation
  // For now, we'll return true (you should implement proper validation)
  return true;
};

// Format currency for display
export const formatCurrency = (
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in cents
};

// Parse Stripe amount to number
export const parseStripeAmount = (amount: number): number => {
  return amount / 100; // Convert from cents to dollars
};

// Convert number to Stripe amount
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100); // Convert from dollars to cents
};
