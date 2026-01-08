// src/layout/SideNav.js
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, type } from '../theme/tokens';
import { softShadow } from '../theme/shadow';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/adminUtils';
import { db } from '../config/firebase';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

const HOME_ICON = require('../../assets/newhome.png');
const POST_ICON = require('../../assets/Tractor.png');
const RAIN_GAUGE_ICON = require('../../assets/RainGuage.png');
const PROFILE_ICON = require('../../assets/Profile.png');
const NOTIFICATIONS_ICON = require('../../assets/Notifications.png');

export default function SideNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const showAdminMenu = isAdmin(user);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        let unread = 0;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data?.read) unread += 1;
        });
        setUnreadCount(unread);
      },
      () => {
        setUnreadCount(0);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  const goTo = drawerScreenName => {
    navigation.navigate('Main', { screen: drawerScreenName });
  };

  const NotificationsIcon = () => (
    <View style={styles.notificationIconWrap}>
      <Image
        source={NOTIFICATIONS_ICON}
        style={styles.navIcon}
        resizeMode="contain"
      />
      {unreadCount > 0 && (
        <View
          style={styles.badge}
          pointerEvents="none"
          testID="notifications-badge"
        >
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.items}>
        <NavItem
          renderIcon={() => (
            <Image
              source={HOME_ICON}
              style={styles.navIcon}
              resizeMode="contain"
            />
          )}
          tooltip="Feed"
          active={route?.name === 'Feed'}
          onPress={() => goTo('Feed')}
        />
        <NavItem
          renderIcon={() => (
            <Image
              source={POST_ICON}
              style={styles.navIcon}
              resizeMode="contain"
            />
          )}
          tooltip="FencePost"
          active={route?.name === 'FencePost'}
          onPress={() => goTo('FencePost')}
        />
        <NavItem
          renderIcon={() => (
            <Image
              source={RAIN_GAUGE_ICON}
              style={styles.navIcon}
              resizeMode="contain"
            />
          )}
          tooltip="Rain Gauge"
          active={route?.name === 'Rain Gauge'}
          onPress={() => goTo('Rain Gauge')}
        />
        <NavItem
          renderIcon={() => <NotificationsIcon />}
          tooltip="Notifications"
          active={route?.name === 'Notifications'}
          onPress={() => goTo('Notifications')}
        />
      </View>

      <View style={styles.footer}>
        {showAdminMenu ? (
          <NavItem
            icon="A"
            tooltip="Admin"
            active={route?.name === 'Admin'}
            onPress={() => goTo('Admin')}
          />
        ) : null}
        <NavItem
          renderIcon={() => (
            <Image
              source={PROFILE_ICON}
              style={styles.navIcon}
              resizeMode="contain"
            />
          )}
          tooltip="Profile"
          active={route?.name === 'Profile'}
          onPress={() => goTo('Profile')}
        />
      </View>
    </View>
  );
}

function NavItem({ icon, renderIcon, tooltip, onPress, active }) {
  const webTooltipProps =
    Platform.OS === 'web' && tooltip ? { title: tooltip } : {};
  const iconColor = active ? colors.primary : colors.muted;
  const isWeb = Platform.OS === 'web';
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      {...webTooltipProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tooltip}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed, hovered }) => [
        styles.item,
        active && styles.active,
        isWeb && hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.itemInner}>
        {typeof renderIcon === 'function' ? (
          <View style={styles.iconWrap}>{renderIcon({ color: iconColor })}</View>
        ) : (
          <Text style={[styles.itemText, active && styles.itemTextActive]}>
            {icon}
          </Text>
        )}
        {isWeb && hovered && tooltip ? (
          <View style={styles.tooltipBelow} pointerEvents="none">
            <Text style={styles.tooltipText}>{tooltip}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 104,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...softShadow,
  },
  items: { gap: spacing.sm, flex: 1 },
  footer: { gap: spacing.sm },
  item: {
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 46,
    height: 46,
  },
  notificationIconWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  adminGlyph: {
    ...type.h2,
    color: colors.muted,
  },
  adminGlyphActive: {
    color: colors.primary,
  },
  active: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: 'rgba(28,61,44,0.08)',
  },
  hovered: {
    backgroundColor: 'rgba(28,61,44,0.05)',
  },
  itemText: { ...type.h2, color: colors.muted },
  itemTextActive: { color: colors.primary },
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
    zIndex: 1000,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tooltipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
