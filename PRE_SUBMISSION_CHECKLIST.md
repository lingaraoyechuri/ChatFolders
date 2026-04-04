# Pre-Submission Checklist for Chrome Web Store

## ✅ Code Cleanup (COMPLETED)

- [x] Removed debug console.log statements
- [x] Kept only essential console.error for error handling
- [x] Updated CHANGELOG.md with version 1.0.1
- [x] Version number updated in manifest.json (1.0.1)

## 📋 Before Building

### 1. **Test Thoroughly**
- [ ] Test on ChatGPT
- [ ] Test on Claude.ai
- [ ] Test on Gemini
- [ ] Test drag functionality
- [ ] Test copy functionality
- [ ] Test question navigation
- [ ] Test position persistence (reload page)
- [ ] Test on different screen sizes

### 2. **Build the Extension**
```bash
npm run build
```

### 3. **Verify Build Output**
- [ ] Check `dist/` folder contains:
  - [ ] `manifest.json`
  - [ ] `content.js` and `content.js.map`
  - [ ] `background.js` and `background.js.map`
  - [ ] `content.css`
  - [ ] All icon files (16, 32, 48, 128)

### 4. **Test Built Extension Locally**
- [ ] Load unpacked extension from `dist/` folder
- [ ] Test all functionality works
- [ ] Check for console errors
- [ ] Verify no broken features

## 📦 Chrome Web Store Submission

### 5. **Prepare Store Listing**

#### **Required Information:**
- [ ] **Name**: "AI Prompt Navigator" ✅
- [ ] **Short Description** (132 chars max):
  ```
  Navigate and organize AI prompts on ChatGPT, Claude, and Gemini. Copy, highlight, and manage your conversations with ease.
  ```
- [ ] **Detailed Description** (should include):
  - Features list
  - Supported platforms
  - How to use
  - Benefits

- [ ] **Category**: Productivity
- [ ] **Language**: English (and others if applicable)

#### **Visual Assets:**
- [ ] **Small Promo Tile** (440x280px) - Optional but recommended
- [ ] **Marquee Promo Tile** (920x680px) - Optional but recommended
- [ ] **Screenshots** (1280x800px or 640x400px):
  - [ ] Screenshot 1: Extension on ChatGPT
  - [ ] Screenshot 2: Extension on Claude.ai
  - [ ] Screenshot 3: Draggable button feature
  - [ ] Screenshot 4: Copy functionality
  - [ ] Screenshot 5: Question navigation

#### **Privacy & Permissions:**
- [ ] **Privacy Policy URL** (REQUIRED):
  - Create a privacy policy page
  - Host it (GitHub Pages, your website, etc.)
  - Add URL to store listing
  - See `PRIVACY.md` template below

- [ ] **Single Purpose Declaration**:
  - Extension has a single purpose: Navigate and organize AI prompts
  - No data collection beyond localStorage for position

### 6. **Privacy Policy Template**

Create a `PRIVACY.md` file or web page with:

```markdown
# Privacy Policy for AI Prompt Navigator

**Last Updated**: [Date]

## Data Collection
AI Prompt Navigator does NOT collect, store, or transmit any personal data.

## Local Storage
The extension uses browser localStorage to save:
- Button position preferences
- No personal information is stored

## Permissions
- **Host Permissions**: Required to inject content scripts on:
  - chatgpt.com
  - claude.ai
  - gemini.google.com
  
  These permissions are necessary for the extension to function.

## Third-Party Services
This extension does not use any third-party analytics, tracking, or data collection services.

## Contact
For privacy concerns, contact: [Your Email]
```

### 7. **Store Listing Best Practices**

#### **Description Template:**
```
AI Prompt Navigator helps you organize and navigate your AI conversations across multiple platforms.

✨ Features:
• Navigate questions instantly - Jump to any question in your conversation
• Copy prompts easily - One-click copy with visual feedback
• Drag & position - Move the button anywhere on screen
• Multi-platform support - Works on ChatGPT, Claude, and Gemini
• Smart detection - Automatically finds all your questions
• Persistent position - Your button position is saved

🎯 Perfect for:
• Developers managing multiple AI conversations
• Researchers organizing prompts
• Anyone who wants better AI workflow management

📱 Supported Platforms:
• ChatGPT (chatgpt.com)
• Claude (claude.ai)
• Gemini (gemini.google.com)

🔒 Privacy:
• No data collection
• No tracking
• All data stays local
```

### 8. **Before Uploading ZIP**

- [ ] Remove `node_modules/` from ZIP (if including)
- [ ] Remove source maps from production (optional, but recommended)
- [ ] Create ZIP of `dist/` folder only
- [ ] ZIP file name: `ai-prompt-navigator-v1.0.1.zip`

### 9. **Upload Process**

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload your ZIP file
4. Fill in all required fields:
   - [ ] Name
   - [ ] Description
   - [ ] Category
   - [ ] Screenshots
   - [ ] Privacy Policy URL
   - [ ] Single Purpose Declaration
5. Submit for review

### 10. **Review Process**

- Review typically takes 1-3 business days
- You'll receive email notifications
- Address any feedback from reviewers

## 🚨 Common Issues to Avoid

- ❌ Don't include `node_modules/` in ZIP
- ❌ Don't forget privacy policy URL
- ❌ Don't use placeholder text in descriptions
- ❌ Don't submit without testing the built extension
- ❌ Don't forget to update version number
- ❌ Don't include debug code

## 📝 Post-Submission

- [ ] Monitor review status
- [ ] Respond to reviewer feedback promptly
- [ ] Prepare for launch announcement
- [ ] Update README with store link once published

## 🎉 Success Checklist

- [ ] Extension published
- [ ] Store listing complete
- [ ] Privacy policy accessible
- [ ] All features working
- [ ] Ready for users!

---

**Good luck with your submission!** 🚀
