import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Initialize Sentry for error tracking
// Note: Replace with your actual Sentry DSN when you create a Sentry project
const SENTRY_DSN = 'https://your-sentry-dsn@sentry.io/your-project-id';

export const initializeSentry = () => {
  // Only initialize on web for now (can expand to native later)
  if (Platform.OS === 'web') {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        // Performance Monitoring
        tracesSampleRate: 0.1, // Capture 10% of transactions
        // Set to true to enable debug mode
        debug: false,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        // Session Replay sample rate
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error);
    }
  }
};

// Helper to log errors to Sentry
export const logError = (error, context = {}) => {
  console.error('Error:', error);
  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (e) {
    console.warn('Failed to log error to Sentry:', e);
  }
};

// Helper to log custom events
export const logEvent = (eventName, data = {}) => {
  try {
    Sentry.captureMessage(eventName, {
      level: 'info',
      extra: data,
    });
  } catch (e) {
    console.warn('Failed to log event to Sentry:', e);
  }
};

// Helper to set user context
export const setUserContext = (user) => {
  try {
    if (user) {
      Sentry.setUser({
        id: user.uid,
        email: user.email,
      });
    } else {
      Sentry.setUser(null);
    }
  } catch (e) {
    console.warn('Failed to set user context:', e);
  }
};
