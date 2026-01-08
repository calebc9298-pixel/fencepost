import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';

export default function AsyncState({
  loading,
  error,
  isEmpty,
  children,
  renderSkeleton,
  emptyTitle = 'Nothing here yet',
  emptySubtitle = 'Try posting something new.',
  errorTitle = 'Something went wrong',
  errorMessage = 'Please try again.',
  onRetry,
}) {
  if (loading) {
    if (typeof renderSkeleton === 'function') return renderSkeleton();
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.stateText}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{errorTitle}</Text>
        <Text style={styles.stateText}>{errorMessage || String(error)}</Text>
        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{emptyTitle}</Text>
        <Text style={styles.stateText}>{emptySubtitle}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  stateBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    color: '#4a4a4a',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  retryText: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
});
