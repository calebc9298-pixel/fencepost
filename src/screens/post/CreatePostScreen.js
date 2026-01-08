import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AppShell from '../../layout/AppShell';

export default function CreatePostScreen({ navigation }) {
  return (
    <AppShell title="Create">
      <View style={styles.container}>
        <Text style={styles.title}>Create a FencePost</Text>
        <Text style={styles.subtitle}>
          Share detailed anonymous farm activity data with farmers everywhere
        </Text>

        <TouchableOpacity
          style={styles.fencePostButton}
          onPress={() => navigation.navigate('CreateFencePost')}
          testID="createpost-start-fencepost"
        >
          <Image
            source={require('../../../assets/newpen.png')}
            style={styles.fencePostIcon}
          />
          <Text style={styles.fencePostTitle}>Start a FencePost</Text>
        </TouchableOpacity>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d5016',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  fencePostButton: {
    backgroundColor: '#f8faf6',
    padding: 30,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#2d5016',
    alignItems: 'center',
    marginBottom: 20,
  },
  fencePostIcon: {
    width: 48,
    height: 48,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  fencePostTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 10,
  },
  fencePostDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
