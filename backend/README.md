# Backend API Server

This is the backend API server for the Perplexity Chrome Extension subscription management system.

## Features

- Stripe subscription management
- Firebase authentication
- Usage metrics tracking
- Billing history
- Payment method management
- Webhook handling for Stripe events

## Prerequisites

- Node.js 18+
- npm or yarn
- Stripe account
- Firebase project
- Database (optional, for production)

## Setup

1. **Clone the repository and navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your actual values:

   - Get Stripe keys from your Stripe dashboard
   - Get Firebase credentials from your Firebase project settings
   - Set up your database connection string (if using a database)

4. **Set up Stripe:**

   - Create a Stripe account at https://stripe.com
   - Get your API keys from the Stripe dashboard
   - Set up webhook endpoints in your Stripe dashboard pointing to `/api/webhooks/stripe`
   - Get the webhook secret from Stripe

5. **Set up Firebase:**

   - Create a Firebase project
   - Generate a service account key
   - Download the JSON file and extract the required fields

6. **Start the development server:**

   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

All endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Subscription Management

- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/checkout` - Create checkout session
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription

### Usage Metrics

- `GET /api/subscriptions/usage` - Get usage metrics
- `PUT /api/subscriptions/usage` - Update usage metrics

### Billing

- `GET /api/subscriptions/billing` - Get billing history
- `GET /api/subscriptions/payment-methods` - Get payment methods
- `PUT /api/subscriptions/payment-method` - Update payment method

### Webhooks

- `POST /api/webhooks/stripe` - Handle Stripe webhook events

### Health Check

- `GET /api/health` - Server health check

## Testing

### Test Cards

Use these Stripe test card numbers:

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Requires Authentication**: `4000002500003155`

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## Production Deployment

1. **Set up a production database** (PostgreSQL, MySQL, etc.)
2. **Update environment variables** for production
3. **Set up SSL/TLS** certificates
4. **Configure CORS** for your production domain
5. **Set up monitoring and logging**
6. **Deploy to your preferred platform** (Heroku, AWS, Google Cloud, etc.)

## Security Considerations

- Always use HTTPS in production
- Validate all input data
- Implement rate limiting
- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor for security vulnerabilities

## Troubleshooting

### Common Issues

1. **CORS errors**: Make sure your CORS configuration includes your Chrome extension's origin
2. **Authentication errors**: Verify your Firebase configuration and token
3. **Stripe webhook errors**: Check your webhook secret and endpoint URL
4. **Database connection errors**: Verify your database connection string

### Logs

Check the server logs for detailed error information:

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
