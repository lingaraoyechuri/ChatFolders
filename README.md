# AI Prompt Navigator - Chrome Extension

**Navigate, organize, and manage AI conversations across ChatGPT, Claude, Gemini, Perplexity, and DeepSeek with ease.**

A powerful Chrome extension that helps you organize, navigate, and manage your AI conversations. Copy prompts, highlight questions, and streamline your workflow across multiple AI platforms.

## ✨ Key Features

### 🎯 **AI Platform Support**

- **ChatGPT**: Navigate and organize OpenAI conversations
- **Claude**: Manage Anthropic AI interactions
- **Gemini**: Organize Google AI conversations
- **Perplexity**: Streamline search-based AI chats
- **DeepSeek**: Navigate coding and technical discussions

### 🚀 **Core Functionality**

- **Smart Question Detection**: Automatically finds and lists all your questions
- **One-Click Navigation**: Jump to any question in your conversation
- **Copy to Clipboard**: Instantly copy prompts with modern UI
- **Visual Highlighting**: Smooth scroll and highlight animations
- **Compact Design**: More questions visible in less space

### 💡 **User Experience**

- **Hover Interactions**: Modern copy buttons appear on hover
- **Smooth Animations**: Professional slide-in/out effects
- **Responsive Design**: Works on all screen sizes
- **Keyboard Accessible**: Full keyboard navigation support

## Architecture

The extension consists of two main parts:

1. **Frontend (Chrome Extension)**: React-based UI with TypeScript
2. **Backend API**: Node.js/Express server for subscription management

## Development

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Firebase project
- Stripe account (for subscription features)

### Frontend Setup

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Firebase configuration in `src/config/firebase.ts`

4. Build the extension:

   ```bash
   # Development build with watch mode
   npm start

   # Production build
   npm run build
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

See [backend/README.md](backend/README.md) for detailed backend setup instructions.

### Installing the Extension in Chrome

1. Build the extension using one of the commands above
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `dist` directory from this project
5. The extension should now be installed and active when you visit supported platforms

## Subscription Plans

- **Free**: 3 folders, 10 chats per folder, local storage only
- **Basic ($4.99/month)**: 10 folders, 50 chats per folder, cloud storage
- **Pro ($9.99/month)**: Unlimited folders and chats, advanced features
- **Enterprise ($29.99/month)**: Custom integrations, dedicated support

## API Documentation

The backend API provides endpoints for:

- Subscription management
- Usage metrics tracking
- Billing history
- Payment method management
- Stripe webhook handling

See [docs/backend-api.md](docs/backend-api.md) for complete API documentation.

## Security

- Firebase authentication with ID tokens
- Stripe webhook signature verification
- CORS configuration for Chrome extensions
- Environment variable protection
- Input validation and sanitization

## Testing

### Stripe Test Cards

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Requires Authentication**: `4000002500003155`

### Webhook Testing

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## Deployment

### Frontend

The Chrome extension is built and distributed through the Chrome Web Store or manual installation.

### Backend

Deploy the backend to your preferred platform:

- Heroku
- AWS
- Google Cloud
- DigitalOcean
- Vercel

Ensure to:

- Set up production environment variables
- Configure SSL/TLS certificates
- Set up monitoring and logging
- Implement rate limiting
- Configure CORS for production domains

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT
