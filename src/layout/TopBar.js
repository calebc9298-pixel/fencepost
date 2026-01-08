// src/layout/TopBar.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, type, radius } from '../theme/tokens';

export default function TopBar({ title = 'FencePost' }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
        <View />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  inner: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backdropFilter: 'blur(8px)',
  },
  title: {
    ...type.title,
    color: colors.text,
  },
});
