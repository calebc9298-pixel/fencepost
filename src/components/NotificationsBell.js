import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Pressable, Platform } from 'react-native';
import NotificationsBar from './NotificationsBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
} from 'firebase/firestore';

export default function NotificationsBell() {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Keep this query simple to avoid additional composite index requirements.
    // We count unread client-side.
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
        // Don't block rendering the bell if notifications fail to load.
        setUnreadCount(0);
      }
    );

    return () => unsub();
  }, [user]);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View style={styles.container}>
      <View style={styles.bellWrap}>
        <Pressable
          onPress={() => setVisible(!visible)}
          style={styles.bellButton}
          testID="notifications-bell"
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          title="Notifications"
          accessibilityLabel="Notifications"
          accessibilityHint="Open notifications"
        >
          <Image
            source={require('../../assets/Notifications.png')}
            style={styles.bellIcon}
          />
        </Pressable>
        {Platform.OS === 'web' && hovered && (
          <View style={styles.tooltipBelow} pointerEvents="none">
            <Text style={styles.tooltipText}>Notifications</Text>
          </View>
        )}
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
      {visible && (
        <View style={styles.drawerDropdown} testID="notifications-dropdown">
          <NotificationsBar onNavigate={() => setVisible(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    width: '100%',
    marginLeft: -30,
  },
  bellWrap: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 0,
    borderWidth: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  bellIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#2D5016',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  tooltipBelow: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5016',
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
    color: '#2D5016',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  drawerDropdown: {
    position: 'relative',
    width: 'calc(100% + 55px)', // shrink width by another 20px
    left: 0, // reset left shift
    right: -20, // move dropdown 20px to the right
    maxHeight: 320, // taller for more notifications
    backgroundColor: '#ACD1AF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D5016',
    marginTop: 8,
    padding: 0, // remove extra padding, handled by NotificationsBar
    overflow: 'hidden', // hide scrollbars
    zIndex: 10,
    alignSelf: 'stretch', // fill parent
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
});
