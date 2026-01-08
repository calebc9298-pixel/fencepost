import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AspectRatioImage from './AspectRatioImage';
import { colors, spacing, radius, type } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { shadowStyles } from '../theme/shadow';

/**
 * PostCard - Compact, modern card layout for feed posts
 * Supports different post types: simple, fencepost, rainGauge
 *
 * Features:
 * - Compact single-line metadata (@username · location · time)
 * - Clamped text content with "Read more" affordance
 * - Fixed aspect-ratio images with rounded corners
 * - Inline stat posts for compactness
 * - Horizontal actions row with icons + counts
 */
export default function PostCard({
  post,
  onPress,
  onLike,
  onDelete,
  onImagePress,
  userCanDelete = false,
}) {
  const [hoverComment, setHoverComment] = useState(false);
  const [hoverLike, setHoverLike] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  const formatTime = timestamp => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const renderMetadata = () => {
    const username = post.username ? `@${post.username}` : 'Anonymous';
    const locationParts = [];
    if (post.city) locationParts.push(String(post.city));
    if (post.state) locationParts.push(String(post.state).toUpperCase());
    const location = locationParts.length ? locationParts.join(', ') : null;
    const time = formatTime(post.timestamp);

    return (
      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>
          <Text style={styles.metaUsername}>{username}</Text>
          {location && (
            <>
              <Text style={styles.metaSeparator}> · </Text>
              <Text style={styles.metaLocation}>{location}</Text>
            </>
          )}
          <Text style={styles.metaSeparator}> · </Text>
          <Text style={styles.metaTime}>{time}</Text>
        </Text>
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.actionsRow}>
      <View style={styles.actionWrap}>
        <Pressable
        onPress={onPress}
        style={({ pressed, hovered }) => [
          styles.actionButton,
          Platform.OS === 'web' && hovered && styles.actionButtonHover,
          pressed && styles.actionButtonPressed,
        ]}
        accessibilityLabel="Comments"
        accessibilityHint="Open comments"
        title="Comments"
          onHoverIn={() => setHoverComment(true)}
          onHoverOut={() => setHoverComment(false)}
      >
        <Image
          source={require('../../assets/ain (9).png')}
          style={styles.commentIcon}
          resizeMode="contain"
        />
        <Text style={styles.actionCount}>{post.commentCount || 0}</Text>
        </Pressable>
        {Platform.OS === 'web' && hoverComment && (
          <View style={styles.tooltipBelow} pointerEvents="none">
            <Text style={styles.tooltipText}>Comments</Text>
          </View>
        )}
      </View>

      <View style={styles.actionWrap}>
        <Pressable
        onPress={onLike}
        style={({ pressed, hovered }) => [
          styles.actionButton,
          Platform.OS === 'web' && hovered && styles.actionButtonHover,
          pressed && styles.actionButtonPressed,
        ]}
        accessibilityLabel="Like"
        accessibilityHint="Like this post"
        title="Like"
          onHoverIn={() => setHoverLike(true)}
          onHoverOut={() => setHoverLike(false)}
      >
        <Image
          source={require('../../assets/Thumbs up.png')}
          style={styles.likeIcon}
        />
        <Text style={styles.actionCount}>{post.likes || 0}</Text>
        </Pressable>
        {Platform.OS === 'web' && hoverLike && (
          <View style={styles.tooltipBelow} pointerEvents="none">
            <Text style={styles.tooltipText}>Like</Text>
          </View>
        )}
      </View>

      {userCanDelete && (
        <View style={[styles.actionWrap, styles.deleteWrap]}>
          <Pressable
          onPress={onDelete}
          accessibilityLabel="Delete post"
          style={({ pressed, hovered }) => [
            styles.deleteAction,
            Platform.OS === 'web' && hovered && styles.actionButtonHover,
            pressed && styles.actionButtonPressed,
          ]}
          title="Delete"
            onHoverIn={() => setHoverDelete(true)}
            onHoverOut={() => setHoverDelete(false)}
        >
          <Image
            source={require('../../assets/ain (10).png')}
            style={styles.trashIcon}
            resizeMode="contain"
          />
          </Pressable>
          {Platform.OS === 'web' && hoverDelete && (
            <View style={styles.tooltipBelow} pointerEvents="none">
              <Text style={styles.tooltipText}>Delete</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderSimplePost = () => (
    <>
      {renderMetadata()}

      {post.text && (
        <Text style={styles.postText} numberOfLines={3}>
          {post.text}
        </Text>
      )}

      {post.images && post.images.length > 0 && (
        <AspectRatioImage
          uri={post.images[0]}
          aspectRatio={4 / 5}
          maxHeight={300}
          width="55%"
          onPress={onImagePress ? () => onImagePress(post.images[0]) : null}
          style={styles.postImage}
        />
      )}

      {renderActions()}
    </>
  );

  const renderRainGaugePost = () => (
    <>
      <View style={styles.headerRow}>
        <View style={styles.typeChip}>
          <Image
            source={require('../../assets/RainGuage.png')}
            style={styles.rainGaugeIcon}
            resizeMode="contain"
          />
          <Text style={styles.typeChipText}>Rain Gauge</Text>
        </View>
        {renderMetadata()}
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPrimary}>
          <Text style={styles.statValue}>{post.rainfall}"</Text>
          <Text style={styles.statLabel}>rainfall</Text>
        </View>
        <View style={styles.statSecondary}>
          <Text style={styles.statDetail}>
            <Text style={styles.statDetailLabel}>Date: </Text>
            {post.date}
          </Text>
        </View>
      </View>

      {post.notes && (
        <Text style={styles.postText} numberOfLines={2}>
          {post.notes}
        </Text>
      )}

      {renderActions()}
    </>
  );

  const renderFencePostPost = () => {
    const activityLabel = post.activity
      ? post.activity.charAt(0).toUpperCase() + post.activity.slice(1)
      : 'FencePost';

    // Calculate cost per acre for inline display
    let costPerAcre = null;
    if (
      post.activity === 'planting' &&
      post.data?.population &&
      post.data?.totalCost &&
      post.data?.crop
    ) {
      const population = parseFloat(
        String(post.data.population).replace(/,/g, '')
      );
      const costPerBag = parseFloat(
        String(post.data.totalCost).replace(/,/g, '')
      );
      const cropLower = post.data.crop.toLowerCase();

      let seedsPerBag;
      if (cropLower.includes('corn')) {
        seedsPerBag = 80000;
      } else if (cropLower.includes('bean') || cropLower.includes('soy')) {
        seedsPerBag = 140000;
      }

      if (seedsPerBag) {
        const bagsPerAcre = population / seedsPerBag;
        costPerAcre = (bagsPerAcre * costPerBag).toFixed(2);
      }
    }

    return (
      <>
        <View style={styles.headerRow}>
          <View style={styles.typeChip}>
            <Image
              source={require('../../assets/Tractor.png')}
              style={styles.tractorIcon}
              resizeMode="contain"
            />
            <Text style={styles.typeChipText}>{activityLabel}</Text>
          </View>
          {renderMetadata()}
        </View>

        <View style={styles.fencePostContent}>
          <View style={styles.fencePostData}>
            {Object.entries(post.data || {})
              .filter(
                ([key]) =>
                  key !== 'totalCost' &&
                  key !== 'fertilizerCost' &&
                  key !== 'fuelCostPerGallon'
              )
              .slice(0, 3)
              .map(([key, value]) => (
                <View key={key} style={styles.dataItem}>
                  <Text style={styles.dataLabel} numberOfLines={1}>
                    {key}:
                  </Text>
                  <Text style={styles.dataValue} numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              ))}

            {costPerAcre && (
              <View style={styles.dataItem}>
                <Text style={[styles.dataLabel, styles.costLabel]}>
                  Cost/acre:
                </Text>
                <Text style={[styles.dataValue, styles.costValue]}>
                  ${costPerAcre}
                </Text>
              </View>
            )}
          </View>

          {post.images && post.images.length > 0 && (
            <AspectRatioImage
              uri={post.images[0]}
              aspectRatio={1}
              onPress={onImagePress ? () => onImagePress(post.images[0]) : null}
              style={styles.fencePostImage}
            />
          )}
        </View>

        {renderActions()}
      </>
    );
  };

  const renderContent = () => {
    if (post.type === 'simple') return renderSimplePost();
    if (post.type === 'rainGauge') return renderRainGaugePost();
    return renderFencePostPost();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.98}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyles.sm,
    width: '100%',
    alignSelf: 'stretch',
  },

  // Metadata
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
  },
  typeChipText: {
    ...type.small,
    color: colors.primary,
    fontSize: 11,
  },
  metaRow: {
    flex: 1,
    minWidth: 0,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...type.small,
    color: colors.muted,
    fontSize: 13,
    flexShrink: 1,
  },
  metaUsername: {
    fontWeight: '600',
    color: colors.primary,
  },
  metaSeparator: {
    color: colors.muted,
    opacity: 0.5,
  },
  metaLocation: {
    color: colors.muted,
  },
  metaTime: {
    color: colors.muted,
  },

  // Post content
  postText: {
    ...type.body,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  postImage: {
    marginBottom: spacing.sm,
  },

  // Rain gauge specific
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statPrimary: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.extrabold,
    color: '#0277bd',
    lineHeight: 28,
  },
  statLabel: {
    ...type.small,
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  statSecondary: {
    flex: 1,
  },
  statDetail: {
    ...type.small,
    color: colors.text,
  },
  statDetailLabel: {
    color: colors.muted,
  },

  // Fence post specific
  fencePostContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fencePostData: {
    flex: 1,
    gap: spacing.xs,
  },
  dataItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dataLabel: {
    ...type.small,
    color: colors.muted,
    textTransform: 'capitalize',
    flex: 0,
    minWidth: 100,
  },
  dataValue: {
    ...type.small,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  costLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  costValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  fencePostImage: {
    width: 80,
    height: 80,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 40,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionWrap: {
    position: 'relative',
    zIndex: 10,
  },
  deleteWrap: {
    marginLeft: 'auto',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    minWidth: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  actionButtonHover: {
    backgroundColor: colors.bg,
  },
  actionButtonPressed: {
    backgroundColor: colors.bg,
    opacity: 0.7,
  },
  actionCount: {
    ...type.small,
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
  },
  commentIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  likeIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  trashIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  rainGaugeIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  tractorIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  deleteAction: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tooltipBelow: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 999,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tooltipText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
