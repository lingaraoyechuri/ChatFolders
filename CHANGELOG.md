# Changelog

All notable changes to the AI Prompt Navigator Chrome Extension will be documented in this file.

## [1.0.2] - 2024-12-XX

### Added

- **Export & Download Features**: Download entire conversations in Markdown, PDF, JSON, HTML, or Text formats
- **Copy as Markdown**: Copy full chat conversations as Markdown to continue context in new chats or tools
- **PDF Export**: Generate beautifully formatted PDFs with multiple layout options (A4, Letter, Single Page)
- **Multi-Format Support**: Export to Markdown (.md), PDF, JSON, HTML, or plain Text
- **ChatGPT Support**: Full export functionality for ChatGPT conversations
- **Claude AI Support**: Complete export support for Claude AI conversations
- **Gemini Support**: Enhanced export features for Google Gemini conversations
- **Loading States**: Progress indicators and loading spinners for export operations
- **Warning Banners**: Informative messages about format limitations (e.g., images in PDF/HTML)
- **Error Handling**: Improved error messages with reload instructions
- **Buy Me a Coffee**: Support button for users who find the extension helpful

### Changed

- **Enhanced Manifest**: Updated description with SEO-optimized keywords for better discoverability
- **Improved UI**: Modern popup interface with platform detection and format selection
- **Better Error Messages**: More descriptive error handling with actionable feedback
- **Updated README**: Comprehensive documentation of new export features

### Fixed

- Fixed ChatGPT connection issues and webpack publicPath errors
- Resolved duplicate content issues in ChatGPT markdown export
- Fixed PDF generation spacing and formatting issues
- Improved HTML export to preserve full DOM structure
- Fixed image handling in PDF exports (removed due to CORS/CSP limitations)
- Resolved CSS parsing errors in html2canvas
- Fixed invalid querySelector issues in DOM extraction

## [1.0.1] - 2024-01-XX

### Added

- **Draggable Button**: Prompts Nav button can now be dragged and positioned anywhere on screen
- **Position Persistence**: Button position is saved and restored across page reloads
- **Enhanced Copy Feature**: Modern copy buttons with visual feedback on each question item
- **Improved UI**: Compact design allowing more questions to fit in the card

### Changed

- Updated button styling with drag feedback (grab cursor, scale animations)
- Improved click vs drag detection for better user experience
- Optimized question item spacing for better space utilization

### Fixed

- Fixed pointer events issue preventing drag functionality
- Improved container structure for Chrome extension compatibility
- Removed debug console.logs for production build

## [1.0.0] - 2024-01-XX

### Added

- Initial release of AI Prompt Navigator
- Support for ChatGPT, Claude, Gemini, Perplexity, and DeepSeek
- Smart question detection and navigation
- Copy to clipboard functionality with modern UI
- Smooth scroll and highlight animations
- Compact design for better space utilization
- Hover interactions and micro-animations
- Cross-platform compatibility

### Features

- **Multi-Platform Support**: Works seamlessly across 5 major AI platforms
- **Question Navigation**: One-click navigation to any question in conversations
- **Copy Functionality**: Modern copy buttons with visual feedback
- **Responsive Design**: Optimized for all screen sizes
- **Accessibility**: Full keyboard navigation support

### Technical

- Built with React 18 and TypeScript
- Styled with styled-components for modern UI
- Chrome Extension Manifest V3 compliant
- Optimized bundle size and performance
