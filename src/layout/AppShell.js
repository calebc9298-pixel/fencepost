// src/layout/AppShell.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import SideNav from './SideNav';
import Footer from '../components/Footer';

export default function AppShell({ title, children, fullWidth = false }) {
  return (
    <View style={styles.root}>
      <SideNav />
      <View style={styles.main}>
        <View style={[styles.contentWrap, fullWidth && styles.contentWrapFull]}>
          <View
            style={[styles.contentInner, fullWidth && styles.contentInnerFull]}
          >
            {children}
          </View>
        </View>
        <Footer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 0,
  },
  contentWrapFull: {
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
  },
  contentInner: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 980,
  },
  contentInnerFull: {
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
});
