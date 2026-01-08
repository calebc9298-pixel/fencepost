import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

export default function Screen({ children, padded = true, style }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
