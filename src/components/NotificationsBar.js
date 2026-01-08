import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsBar({ onNavigate, maxHeight = 220 }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;
    // Listen for likes and comments on user's posts
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(50)
    );
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const toMillis = ts => {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
        if (ts instanceof Date) return ts.getTime();
        return 0;
      };
      items.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));
      setNotifications(items);
    });
    return () => unsub();
  }, [user]);

  const handlePress = async item => {
    if (!user) return;

    try {
      if (!item.read) {
        await updateDoc(doc(db, 'notifications', item.id), { read: true });
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    if (item.postId) {
      try {
        navigation.navigate('Comments', { postId: item.postId });
      } catch {
        if (typeof window !== 'undefined') {
          window.location.assign(`/comments/${item.postId}`);
        }
      }
    }

    if (onNavigate) onNavigate();
  };

  const likes = notifications.filter(n => n.type === 'like');
  const comments = notifications.filter(n => n.type === 'comment');

  const renderNotification = (item) => (
    <TouchableOpacity
      style={[styles.notification, !item.read && styles.unread]}
      onPress={() => handlePress(item)}
      testID={`notification-item-${item.id}`}
    >
      <Text style={styles.text}>
        {!item.read ? 'New: ' : ''}
        {item.message}
      </Text>
      <Text style={styles.time}>
        {new Date(
          item.timestamp?.toDate?.() || item.timestamp || Date.now()
        ).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.bar, maxHeight == null ? null : { maxHeight }]}
      testID="notifications-bar"
    >
      {notifications.length === 0 ? (
        <Text style={styles.empty}>No notifications yet.</Text>
      ) : (
        <FlatList
          data={[{ section: 'likes' }, { section: 'comments' }]}
          keyExtractor={(item) => item.section}
          renderItem={({ item }) => {
            if (item.section === 'likes') {
              return (
                <View>
                  <Text style={styles.sectionHeader}>Likes</Text>
                  {likes.length > 0 ? (
                    likes.map(notification => (
                      <View key={notification.id}>
                        {renderNotification(notification)}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySection}>No likes yet</Text>
                  )}
                </View>
              );
            } else {
              return (
                <View>
                  <Text style={styles.sectionHeader}>Comments</Text>
                  {comments.length > 0 ? (
                    comments.map(notification => (
                      <View key={notification.id}>
                        {renderNotification(notification)}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySection}>No comments yet</Text>
                  )}
                </View>
              );
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'transparent',
    padding: 0,
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
  },
  notification: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: '#2D5016',
  },
  text: {
    fontSize: 11, // lowered font size
    color: '#2D5016',
    marginBottom: 2,
    textAlign: 'left',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  time: {
    fontSize: 10, // lowered font size
    color: '#666',
    textAlign: 'right',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  empty: {
    fontSize: 11, // lowered font size
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'left',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D5016',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySection: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});
