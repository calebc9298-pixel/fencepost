import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, radius, spacing, type } from '../../theme/tokens';

const CommentComposer = forwardRef(function CommentComposer(
  { value, onChangeText, onSend, replyTarget, onCancelReply, inputRef, disabled = false },
  forwardedRef
) {
  const resolvedInputRef = inputRef || forwardedRef;
  const isReply = !!replyTarget;
  const replyUsername = replyTarget?.username
    ? String(replyTarget.username)
    : '';

  return (
    <View style={styles.root}>
      {isReply && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText} numberOfLines={1}>
            Replying to{' '}
            {replyUsername ? `@${replyUsername.replace(/^@/, '')}` : 'comment'}
          </Text>
          <Pressable
            onPress={onCancelReply}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            style={({ hovered, pressed }) => [
              styles.cancelButton,
              Platform.OS === 'web' && hovered && styles.cancelButtonHover,
              pressed && styles.cancelButtonPressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.row}>
        <TextInput
          ref={resolvedInputRef}
          style={[
            styles.input,
            Platform.OS === 'web' && styles.inputWeb,
            disabled && styles.inputDisabled,
          ]}
          placeholder={isReply ? 'Write a reply…' : 'Add a comment…'}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          multiline
          editable={!disabled}
        />

        <Pressable
          onPress={disabled ? undefined : onSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ hovered, pressed }) => [
            styles.sendButton,
            Platform.OS === 'web' && hovered && styles.sendButtonHover,
            pressed && styles.sendButtonPressed,
            disabled && styles.sendButtonDisabled,
          ]}
          accessibilityState={{ disabled }}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
});

export default CommentComposer;

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyBanner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface2,
  },
  replyBannerText: {
    ...type.small,
    color: colors.muted,
    flex: 1,
    marginRight: spacing.md,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  cancelButtonHover: {
    backgroundColor: 'rgba(20, 40, 25, 0.06)',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(20, 40, 25, 0.09)',
  },
  cancelText: {
    ...type.small,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    ...type.body,
  },
  inputWeb: {
    resize: 'none',
    outlineStyle: 'none',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonHover: {
    opacity: 0.92,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    ...type.small,
    color: colors.primaryText,
  },
});
