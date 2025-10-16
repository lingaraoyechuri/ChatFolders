# Contributing to AI Prompt Navigator

Thank you for your interest in contributing to AI Prompt Navigator! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Git

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/yourusername/ai-prompt-navigator.git
   cd ai-prompt-navigator
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development**

   ```bash
   npm start
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🎯 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker
- Include steps to reproduce
- Provide browser and extension version
- Add screenshots if applicable

### Feature Requests

- Check existing issues first
- Provide detailed description
- Explain the use case and benefits

### Code Contributions

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 🧪 Testing

### Manual Testing

- Test on all supported platforms (ChatGPT, Claude, Gemini, Perplexity, DeepSeek)
- Verify copy functionality works
- Check navigation and highlighting
- Test on different screen sizes

### Browser Testing

- Chrome (primary)
- Edge (Chromium-based)
- Other Chromium browsers

## 📝 Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use styled-components for styling
- Maintain consistent formatting
- Add comments for complex logic

## 🔧 Development Guidelines

### Adding New AI Platform Support

1. Update `src/utils/constants.ts`
2. Add selectors in `src/content/content.tsx`
3. Update manifest.json permissions
4. Test thoroughly on the new platform

### UI/UX Changes

- Maintain consistent design language
- Ensure accessibility compliance
- Test hover states and animations
- Verify responsive behavior

## 📋 Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request with:
   - Clear description
   - Screenshots (if UI changes)
   - Testing notes

## 🏷️ Release Process

- Version numbers follow semantic versioning
- Update CHANGELOG.md
- Tag releases appropriately
- Update documentation

## 📞 Support

- GitHub Issues for bug reports
- Discussions for questions
- Email for security issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
