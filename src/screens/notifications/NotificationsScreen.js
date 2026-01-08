import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppShell from '../../layout/AppShell';
import NotificationsBar from '../../components/NotificationsBar';
import { spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export default function NotificationsScreen() {
  const { user } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;

      (async () => {
        try {
          const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            where('read', '==', false)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) return;

          const batch = writeBatch(db);
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
          });
          await batch.commit();
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      })();
    }, [user])
  );

  return (
    <AppShell title="Notifications" fullWidth>
      <View style={styles.wrap}>
        <NotificationsBar maxHeight={null} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: spacing.sm,
  },
});
