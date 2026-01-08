import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/adminUtils';
import AppShell from '../../layout/AppShell';

export default function AdminScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPosts: 0,
    totalComments: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowUpdating, setRowUpdating] = useState({}); // { [userId]: 'banning'|'unbanning' }

  const confirmAsync = (title, message, okText = 'OK', cancelText = 'Cancel') => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise(resolve => {
      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: okText, style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin(user)) {
      Alert.alert('Unauthorized', 'You do not have admin access');
      navigation.goBack();
      return;
    }

    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);

      // Calculate active users (posted in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsersCount = usersData.filter(u => {
        const lastActive = u.lastActive?.toDate?.() || new Date(0);
        return lastActive > thirtyDaysAgo;
      }).length;

      // Fetch all posts for stats only
      const postsSnapshot = await getDocs(collection(db, 'posts'));

      // Fetch all comments
      const commentsSnapshot = await getDocs(collection(db, 'comments'));

      setStats({
        totalUsers: usersData.length,
        activeUsers: activeUsersCount,
        totalPosts: postsSnapshot.size,
        totalComments: commentsSnapshot.size,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, username) => {
    const ok = await confirmAsync('Ban User', `Are you sure you want to ban ${username}?`, 'Ban', 'Cancel');
    if (!ok) return;
    try {
      setRowUpdating(prev => ({ ...prev, [userId]: 'banning' }));
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, banned: true, bannedAt: new Date() } : u)));
      await updateDoc(doc(db, 'users', userId), {
        banned: true,
        bannedAt: new Date(),
      });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`${username} has been banned`);
      } else {
        Alert.alert('Success', `${username} has been banned`);
      }
      await loadAdminData();
    } catch (error) {
      console.error('Error banning user:', error);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Failed to ban user');
      } else {
        Alert.alert('Error', 'Failed to ban user');
      }
    } finally {
      setRowUpdating(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleUnbanUser = async (userId, username) => {
    try {
      setRowUpdating(prev => ({ ...prev, [userId]: 'unbanning' }));
      // optimistic UI
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, banned: false, bannedAt: null } : u)));
      await updateDoc(doc(db, 'users', userId), {
        banned: false,
        bannedAt: null,
      });
      Alert.alert('Success', `${username} has been unbanned`);
      await loadAdminData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      Alert.alert('Error', 'Failed to unban user');
    } finally {
      setRowUpdating(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const renderStatCard = (title, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderUser = ({ item }) => {
    const updating = rowUpdating[item.id];
    const isBanned = !!item.banned;
    return (
      <View style={styles.userCard} testID={`admin-user-row-${item.id}`}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username || item.email}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.userActions}>
          <View
            style={[
              styles.statusChip,
              updating
                ? styles.statusUpdating
                : isBanned
                ? styles.statusBanned
                : styles.statusActive,
            ]}
            accessibilityLabel={
              updating ? 'Status updating' : isBanned ? 'Banned' : 'Active'
            }
            testID={`admin-status-${item.id}`}
          >
            <Text
              style={[
                styles.statusText,
                updating
                  ? styles.statusTextUpdating
                  : isBanned
                  ? styles.statusTextBanned
                  : styles.statusTextActive,
              ]}
            >
              {updating ? 'Updating…' : isBanned ? 'Banned' : 'Active'}
            </Text>
          </View>
          {isBanned ? (
            <TouchableOpacity
              style={styles.unbanButton}
              onPress={() => handleUnbanUser(item.id, item.username || item.email)}
              disabled={!!updating}
              testID={`admin-unban-${item.id}`}
            >
              <Text style={styles.unbanButtonText}>Unban</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.banButton}
              onPress={() => handleBanUser(item.id, item.username || item.email)}
              disabled={!!updating}
              testID={`admin-ban-${item.id}`}
            >
              <Text style={styles.banButtonText}>Ban</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <AppShell title="Admin">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Admin: {user?.email}</Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          {renderStatCard('Total Users', stats.totalUsers, '#2D5016')}
          {renderStatCard('Active Users', stats.activeUsers, '#2D5016')}
        </View>

        {/* Users Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users</Text>
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadAdminData}>
          <Text style={styles.refreshButtonText}>Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#ACD1AF',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 15,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bannedBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC3545',
    marginTop: 5,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(40,167,69,0.08)',
    borderColor: 'rgba(40,167,69,0.35)',
  },
  statusBanned: {
    backgroundColor: 'rgba(220,53,69,0.08)',
    borderColor: 'rgba(220,53,69,0.35)',
  },
  statusUpdating: {
    backgroundColor: 'rgba(108,117,125,0.08)',
    borderColor: 'rgba(108,117,125,0.35)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextActive: { color: '#28A745' },
  statusTextBanned: { color: '#DC3545' },
  statusTextUpdating: { color: '#6c757d' },
  banButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  banButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  unbanButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  unbanButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: '#ACD1AF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#2D5016',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
