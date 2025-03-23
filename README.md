# Perplexity Assistant Chrome Extension

A Chrome extension that enhances your experience on Perplexity.ai by adding a convenient side panel with additional functionality.

## Features

- Automatically detects when you're browsing Perplexity.ai
- Adds a floating button in the top right corner
- Opens a customizable side panel with additional tools and options
- Built with React, TypeScript, and styled-components

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone this repository
2. Install dependencies:

```
npm install
```

### Development Build

To build the extension in development mode with watch mode enabled:

```
npm start
```

### Production Build

To build the extension for production:

```
npm run build
```

### Installing the Extension in Chrome

1. Build the extension using one of the commands above
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `dist` directory from this project
5. The extension should now be installed and active when you visit Perplexity.ai

## Customization

To customize the side panel content, modify the `SidePanel.tsx` file with your desired components and functionality.

## License

MIT
