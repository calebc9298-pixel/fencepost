import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './src/context/AuthContext';
import { PostProvider } from './src/context/PostContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/tokens';
import { initializeSentry } from './src/config/sentry';
import { DefaultSEO } from './src/components/SEO';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Feather } from '@expo/vector-icons';

// Initialize error tracking
initializeSentry();

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    ...Feather.font,
  });

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'google-font-manrope';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    document.body.style.fontFamily =
      "'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  }, []);

  if (Platform.OS !== 'web' && !fontsLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <View />
      </View>
    );
  }

  const appTree = (
    <AuthProvider>
      <PostProvider>
        <DefaultSEO />
        <AppNavigator />
        <StatusBar style="auto" />
      </PostProvider>
    </AuthProvider>
  );

  if (Platform.OS === 'web') {
    return <HelmetProvider>{appTree}</HelmetProvider>;
  }

  return appTree;
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
