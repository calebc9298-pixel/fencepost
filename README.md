# FencePost - Farmer Social Media App

A mobile social networking application designed specifically for farmers to connect, share insights, and compare farming practices.

## Features

### 📱 Core Features

- **Anonymous User Profiles**: Farmers create profiles with their location, acreage, and contact info
- **Multi-Level Chat Rooms**: Regional, Statewide, and National chat feeds
- **Quick Posts**: Share quick updates like Twitter/X
- **FencePost System**: Structured farm activity sharing with detailed data

### 🚜 FencePost Activities

Share detailed information about your farming operations:

- **Planting**: Seed variety, population, row width, fertilizer, attachments
- **Spraying**: Products, rates, tank mixes, weather conditions
- **Fertilizing**: Products, rates, application methods
- **Harvesting**: Yields, moisture, equipment, field conditions
- **Tillage**: Implements, depth, soil conditions
- **Maintenance**: Equipment servicing, parts, costs

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase
  - Authentication
  - Firestore Database
  - Cloud Storage
- **Navigation**: React Navigation

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your phone (for testing)

### Installation

1. Clone the repository:

```bash
cd Fence-Post-App
```

2. Install dependencies:

```bash
npm install
```

3. Set up Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create a Firestore Database
   - Enable Storage
   - Get your Firebase config from Project Settings
   - Update `src/config/firebase.js` with your config

4. Start the development server:

```bash
npm start
```

5. Scan the QR code with Expo Go app on your phone

## E2E Web Tests (Playwright)

- Smoke test (unauthenticated only): `npm run test:e2e:ui`
- Full authenticated flows (login, quick post, comment, notifications, logout):
  - Create a local `.env.e2e` file (ignored by git). Start from `.env.e2e.example`.
    - Set `E2E_EMAIL` and `E2E_PASSWORD` (use a dedicated test account)
  - Optional: set `E2E_BASE_URL` (defaults to the deployed Firebase Hosting URL)
  - Run: `npm run test:e2e:ui`

Tip: to avoid pasting passwords into chat, you can generate `.env.e2e` locally via:

```powershell
npm run setup:e2e
```

Note: the authenticated suite creates a quick post and deletes it as cleanup.

### Multi-user / Social E2E (two accounts)

- Create/update `.env.e2e` (ignored by git) with:
  - `E2E_EMAIL` / `E2E_PASSWORD` (User A)
  - `E2E_EMAIL_2` / `E2E_PASSWORD_2` (User B)
  - Optional: `E2E_BASE_URL`
- Run:
  - `npm run test:e2e:social`

## Firebase Configuration

### Required Firebase Setup

1. **Authentication**
   - Enable Email/Password authentication in Firebase Console

2. **Firestore Database**
   - Create a database in production mode
   - Set up security rules (see below)

3. **Storage**
   - Enable Cloud Storage for profile pictures and post images

### Firestore Security Rules (Basic)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Posts collection
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    // Comments collection
    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

## Project Structure

```
Fence-Post-App/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase configuration
│   ├── context/
│   │   └── AuthContext.js       # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.js      # Main navigation
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── feed/
│   │   │   └── FeedScreen.js
│   │   ├── post/
│   │   │   ├── CreatePostScreen.js
│   │   │   └── CreateFencePostScreen.js
│   │   └── profile/
│   │       └── ProfileScreen.js
│   └── types/
│       └── index.js             # Type definitions
├── App.js                       # Main app entry
└── package.json
```

## Next Steps / To-Do

- [ ] Complete Firebase integration for posts
- [ ] Implement real-time feed updates
- [ ] Add comment functionality
- [ ] Implement post voting/reactions
- [ ] Add image upload capability
- [ ] Create user profile viewing
- [ ] Add search and filter functionality
- [ ] Implement push notifications
- [ ] Add analytics and insights for farmers
- [ ] Weather API integration
- [ ] Dark mode support

## Running the App

### Development

```bash
npm start
```

### iOS (requires Mac)

```bash
npm run ios
```

### Android

```bash
npm run android
```

### Web

```bash
npm run web
```

## Web prerendering (SEO/share previews)

- Tool: `react-snap` prerenders key SPA routes during `expo export`.
- Target routes: `/`, `/Main/Feed`, and one sample profile `/profile/example` (update this list for real public profiles).
- Build with prerender: `npm run build:web:prerender` (outputs static HTML into `dist`).
- Deploy (uses prerendered build): `npm run deploy`.
- Config: adjust `reactSnap.include` in `package.json` to list the exact profile slugs you want crawled (e.g., `/profile/jane-doe`). Client-side routing still works because Firebase Hosting rewrites everything else to `index.html`.

## License

MIT

## Contact

For questions or support, contact the development team.
