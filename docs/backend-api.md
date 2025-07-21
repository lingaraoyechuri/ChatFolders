# Backend API Documentation

This document outlines the backend API endpoints required to support the Chrome extension's subscription management and Stripe integration.

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-backend-api.com/api`

## Authentication

All API endpoints require authentication using Firebase ID tokens. Include the token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### 1. Subscription Management

#### GET /subscriptions/current

Get the current user's subscription information.

**Response:**

```json
{
  "id": "sub_1234567890",
  "userId": "firebase-user-id",
  "planId": "pro",
  "status": "active",
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "stripeCustomerId": "cus_1234567890",
  "stripeSubscriptionId": "sub_1234567890",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### POST /subscriptions/checkout

Create a Stripe checkout session for subscription upgrade.

**Request Body:**

```json
{
  "planId": "pro"
}
```

**Response:**

```json
{
  "id": "cs_1234567890",
  "url": "https://checkout.stripe.com/pay/cs_1234567890",
  "status": "open"
}
```

#### POST /subscriptions/cancel

Cancel the current subscription (cancels at period end).

**Response:**

```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the current period"
}
```

#### POST /subscriptions/reactivate

Reactivate a canceled subscription.

**Response:**

```json
{
  "success": true,
  "message": "Subscription reactivated successfully"
}
```

### 2. Usage Metrics

#### GET /subscriptions/usage

Get the current user's usage metrics.

**Response:**

```json
{
  "userId": "firebase-user-id",
  "foldersCount": 5,
  "totalChatsCount": 25,
  "storageUsed": 1024000,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

#### PUT /subscriptions/usage

Update the user's usage metrics.

**Request Body:**

```json
{
  "foldersCount": 5,
  "totalChatsCount": 25,
  "storageUsed": 1024000
}
```

**Response:**

```json
{
  "userId": "firebase-user-id",
  "foldersCount": 5,
  "totalChatsCount": 25,
  "storageUsed": 1024000,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### 3. Billing Management

#### GET /subscriptions/billing

Get billing history for the current user.

**Response:**

```json
[
  {
    "id": "in_1234567890",
    "amount": 999,
    "currency": "usd",
    "status": "paid",
    "date": "2024-01-01T00:00:00Z",
    "description": "Pro Plan - January 2024",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_1234567890/test_YWNjdF8xMjM0NTY3ODkwLF9Qcm9qZWN0XzEyMzQ1Njc4OTAsX0ludm9pY2VfMTIzNDU2Nzg5MCw_00"
  }
]
```

#### GET /subscriptions/payment-methods

Get payment methods for the current user.

**Response:**

```json
[
  {
    "id": "pm_1234567890",
    "type": "card",
    "last4": "4242",
    "brand": "visa",
    "expMonth": 12,
    "expYear": 2025,
    "isDefault": true
  }
]
```

#### PUT /subscriptions/payment-method

Update the default payment method.

**Request Body:**

```json
{
  "paymentMethodId": "pm_1234567890"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment method updated successfully"
}
```

### 4. Webhooks

#### POST /webhooks/stripe

Handle Stripe webhook events.

**Request Body:**

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "api_version": "2023-10-16",
  "created": 1640995200,
  "data": {
    "object": {
      "id": "sub_1234567890",
      "object": "subscription",
      "status": "active"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_1234567890",
    "idempotency_key": null
  },
  "type": "customer.subscription.updated"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

Common error codes:

- `UNAUTHORIZED`: Invalid or missing authentication token
- `SUBSCRIPTION_NOT_FOUND`: No active subscription found
- `PLAN_NOT_FOUND`: Invalid plan ID
- `PAYMENT_FAILED`: Payment processing failed
- `USAGE_LIMIT_EXCEEDED`: User has exceeded their plan limits

## Implementation Notes

### 1. Stripe Integration

The backend should integrate with Stripe using the official Stripe SDK:

```javascript
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
```

### 2. Firebase Authentication

Verify Firebase ID tokens on each request:

```javascript
const admin = require("firebase-admin");
const decodedToken = await admin.auth().verifyIdToken(token);
const userId = decodedToken.uid;
```

### 3. Database Schema

Recommended database schema for subscriptions:

```sql
CREATE TABLE subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE usage_metrics (
  user_id VARCHAR(255) PRIMARY KEY,
  folders_count INT DEFAULT 0,
  total_chats_count INT DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. Webhook Security

Implement webhook signature verification:

```javascript
const sig = req.headers["stripe-signature"];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 5. Environment Variables

Required environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
DATABASE_URL=...
```

## Testing

### Test Cards

Use Stripe's test card numbers for development:

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Requires Authentication**: `4000002500003155`

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on all endpoints
2. **Input Validation**: Validate all input data
3. **CORS**: Configure CORS properly for Chrome extension
4. **HTTPS**: Use HTTPS in production
5. **Token Expiration**: Handle token expiration gracefully
6. **Error Logging**: Log errors for debugging but don't expose sensitive data
