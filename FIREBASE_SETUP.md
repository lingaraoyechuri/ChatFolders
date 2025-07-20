# Firebase Setup Guide

This guide will help you set up Firebase for the Chrome extension's cloud storage and authentication features.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "chat-folder-extension")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 4: Configure Security Rules

1. In Firestore Database, go to the "Rules" tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Users can access their own folders
      match /folders/{folderId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

1. In your Firebase project, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Enter an app nickname (e.g., "Chrome Extension")
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 6: Update Extension Configuration

1. Open `src/config/firebase.ts`
2. Replace the placeholder configuration with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

## Step 7: Test the Setup

1. Build and load your extension
2. Open the extension on a supported platform (ChatGPT, Perplexity, etc.)
3. Click on the folder icon to open the side panel
4. Look for the "Sign In" button at the bottom
5. Create an account or sign in
6. Enable cloud storage
7. Create a folder and verify it syncs to Firebase

## Security Considerations

### For Production

1. **Update Firestore Rules**: Modify the security rules to be more restrictive based on your needs
2. **Enable App Check**: Add Firebase App Check to prevent abuse
3. **Set up proper CORS**: Configure CORS settings for your domain
4. **Monitor Usage**: Set up Firebase Analytics and monitoring

### Environment Variables

For better security, consider using environment variables:

1. Create a `.env` file in your project root
2. Add your Firebase config:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

3. Update `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
```

## Troubleshooting

### Common Issues

1. **Authentication not working**: Check if Email/Password auth is enabled
2. **Database access denied**: Verify Firestore security rules
3. **CORS errors**: Check if your domain is allowed in Firebase settings
4. **Extension not loading**: Verify Firebase config is correct

### Debug Mode

To enable debug logging, add this to your Firebase config:

```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === "development") {
  console.log("Firebase config:", firebaseConfig);
}
```

## Next Steps

After setting up Firebase:

1. **Test Authentication**: Verify users can sign up and sign in
2. **Test Cloud Sync**: Create folders and verify they sync across devices
3. **Test Offline Mode**: Disconnect internet and verify offline functionality
4. **Monitor Usage**: Check Firebase console for any errors or issues

## Support

If you encounter issues:

1. Check the Firebase console for error logs
2. Verify your configuration matches the Firebase project settings
3. Check the browser console for any JavaScript errors
4. Ensure all required Firebase services are enabled
