import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, radius } from '../theme/tokens';

/**
 * AspectRatioImage - A reusable image container with fixed aspect ratio
 * Eliminates black bars by using cover mode with proper aspect ratio constraints
 *
 * @param {string} uri - Image URI
 * @param {number} aspectRatio - Aspect ratio (e.g., 4/5 or 1)
 * @param {function} onPress - Optional press handler for tap/click
 * @param {object} style - Additional container styles
 */
export default function AspectRatioImage({
  uri,
  aspectRatio = 4 / 5,
  onPress,
  style,
  maxHeight,
  width = '100%',
}) {
  const ImageWrapper = onPress ? TouchableOpacity : View;

  return (
    <ImageWrapper
      style={[
        styles.container,
        { aspectRatio, width },
        maxHeight && { maxHeight },
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel="Post image"
      />
    </ImageWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
