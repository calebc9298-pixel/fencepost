# Firebase Setup Guide for FencePost

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `fencepost-app` (or your preferred name)
4. Disable Google Analytics (optional, can enable later)
5. Click "Create Project"

## Step 2: Register Your App

1. In the Firebase Console, click the Web icon (</>)
2. Register app with nickname: "FencePost Mobile"
3. Don't check "Firebase Hosting" for now
4. Click "Register App"
5. Copy the Firebase configuration object

## Step 3: Update Firebase Config

1. Open `src/config/firebase.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};
```

## Step 4: Enable Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Click "Email/Password"
3. Enable it
4. Save

## Step 5: Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create Database"
3. Start in **production mode** (we'll add rules next)
4. Choose a location closest to your users
5. Click "Enable"

## Step 6: Set Up Firestore Collections

The app will automatically create these collections when users interact:

- `users` - User profiles
- `posts` - All posts (simple and FencePosts)
- `comments` - Comments on posts
- `regions` - Regional chat data
- `states` - Statewide chat data
- `national` - National chat data

## Step 7: Configure Firestore Security Rules

1. Go to "Firestore Database" → "Rules"
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
      allow delete: if isAuthenticated() && isOwner(userId);
    }

    // Posts collection (both simple posts and FencePosts)
    match /posts/{postId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid;
    }

    // Comments collection
    match /comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() &&
                      resource.data.userId == request.auth.uid;
    }

    // Regional chats
    match /regions/{regionId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Statewide chats
    match /states/{stateId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // National chat
    match /national/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

3. Click "Publish"

## Step 8: Enable Cloud Storage

1. Go to "Storage" in Firebase Console
2. Click "Get Started"
3. Start in **production mode**
4. Choose the same location as Firestore
5. Click "Done"

## Step 9: Configure Storage Security Rules

1. Go to "Storage" → "Rules"
2. Replace with these rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /posts/{postId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 10: Test Your Setup

1. Make sure you've updated `src/config/firebase.js` with your actual config
2. Start the app: `npm start`
3. Try registering a new user
4. Check Firebase Console to see if the user appears in Authentication and Firestore

## Firestore Data Structure

### Users Collection (`users/{userId}`)

```json
{
  "uid": "firebase-auth-uid",
  "name": "John Farmer",
  "email": "john@example.com",
  "address": {
    "street": "123 Farm Road",
    "city": "Des Moines",
    "state": "IA",
    "zipCode": "50309"
  },
  "acresFarmed": 1200,
  "region": "midwest",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Posts Collection (`posts/{postId}`)

```json
{
  "postId": "generated-id",
  "userId": "user-id",
  "type": "fencepost",
  "activity": "planting",
  "chatRoom": "regional",
  "region": "midwest",
  "state": "IA",
  "data": {
    "crop": "Corn",
    "variety": "Pioneer 1234",
    "population": "32000",
    "rowWidth": "30"
  },
  "commentCount": 0,
  "createdAt": "timestamp"
}
```

## Troubleshooting

### Can't connect to Firebase

- Check that your Firebase config is correct in `firebase.js`
- Verify your internet connection
- Check Firebase Console for any errors

### Web image uploads fail / hang (Storage CORS)

If web uploads stall and you see browser errors like `net::ERR_FAILED` for requests to `https://firebasestorage.googleapis.com/...`, your Storage bucket may be missing CORS configuration for your web origin.

This repo includes a starter CORS file: `storage.cors.json`.

Important: apply CORS to the exact bucket your app uses (see `src/config/firebase.js` → `storageBucket`). For this project it is `fencepost-65663.appspot.com`. Some Firebase consoles also display a `fencepost-65663.firebasestorage.app` bucket name; if you have both, set CORS on the one matching your `storageBucket` (or set it on both to be safe).

Apply it with either tool:

- With `gsutil`:
  - `gsutil cors set storage.cors.json gs://YOUR_BUCKET`
- With modern `gcloud`:
  - `gcloud storage buckets update gs://YOUR_BUCKET --cors-file=storage.cors.json`

After updating CORS, retry the in-app upload (or run the web debug upload).

### Authentication errors

- Ensure Email/Password is enabled in Authentication settings
- Check that password is at least 6 characters

### Permission denied errors

- Verify Firestore and Storage rules are published
- Make sure user is authenticated before accessing data
- Check that security rules match your app's needs

## Next Steps

After setup is complete:

1. Test user registration and login
2. Test creating posts
3. Add more features like real-time updates
4. Consider adding indexes for better query performance
5. Set up Firebase Analytics (optional)
6. Configure backup schedules

## Important Notes

- Keep your Firebase config secure (don't commit to public repos)
- Consider using environment variables for production
- Monitor Firebase usage to stay within free tier limits
- Set up billing alerts in Firebase Console
- Regularly backup your Firestore data
