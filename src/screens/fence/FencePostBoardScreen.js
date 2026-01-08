import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Pressable, TextInput, ActivityIndicator, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppShell from '../../layout/AppShell';
import { usePost } from '../../context/PostContext';
import { useAuth } from '../../context/AuthContext';
import PostCard from '../../components/PostCard';
import { fonts } from '../../theme/fonts';
import { uploadMultipleImages } from '../../utils/imageUpload';
import { useFocusEffect } from '@react-navigation/native';

export default function FencePostBoardScreen({ navigation }) {
  const { posts, deletePost, likePost, addPost, setActiveRoom } = usePost();
  const [sortBy, setSortBy] = useState('relevant');
  const [sortOpen, setSortOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState([]);
    useEffect(() => {
      if (typeof setActiveRoom === 'function') setActiveRoom('state');
    }, []);

    const [composerOpen, setComposerOpen] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [composerImages, setComposerImages] = useState([]);
    const [composerUploading, setComposerUploading] = useState(false);

    const handlePickComposerImage = async () => {
      const DEBUG =
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('FP_UPLOAD_DEBUG') === '1';
      const uploadLog = (...args) => {
        if (!DEBUG) return;
        console.log('[upload]', ...args);
      };

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        uploadLog('pick:start', { source: 'web:file-input', accept: 'image/*' });
        const file = await new Promise(resolve => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = () =>
            resolve(input.files && input.files[0] ? input.files[0] : null);
          input.click();
        });

        if (!file) return;

        if (typeof File === 'undefined' || !(file instanceof File)) {
          alert('Please select an image file.');
          return;
        }
        if (typeof file.size !== 'number' || file.size <= 0) {
          alert('Selected image file is invalid (size 0).');
          return;
        }
        if (typeof file.type !== 'string' || !file.type.startsWith('image/')) {
          alert('Please select a valid image.');
          return;
        }
        const previewUri =
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : null;

        uploadLog('pick:result', {
          source: 'web:file-input',
          name: file?.name ?? null,
          type: file?.type ?? null,
          size: typeof file?.size === 'number' ? file.size : null,
          uri: previewUri || null,
        });

        setComposerImages(prev => [...prev, { uri: previewUri || '', file }]);
        return;
      }

      uploadLog('pick:start', { source: 'expo-image-picker:library' });
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        alert('Permission to access photos is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        uploadLog('pick:result', {
          source: 'expo-image-picker:library',
          name: asset?.fileName ?? null,
          type: asset?.mimeType ?? asset?.type ?? null,
          size: asset?.fileSize ?? null,
          uri: asset?.uri ?? null,
        });
        setComposerImages(prev => [...prev, asset]);
      }
    };

    const handleRemoveComposerImage = index => {
      setComposerImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitComposer = async () => {
      if (!composerText.trim()) return;
      if (!userProfile?.state) return;
      if (composerUploading) return;
      try {
        setComposerUploading(true);
        let imageUrls = [];
        if (composerImages.length > 0) {
          imageUrls = await uploadMultipleImages(
            composerImages
              .map(a => (a?.file ? a.file : a?.uploadUri ? a.uploadUri : a?.uri))
              .filter(Boolean),
            'posts'
          );
        }
        await addPost({
          type: 'simple',
          text: composerText,
          chatRoom: 'state',
          images: imageUrls,
          username: userProfile?.username || null,
          state: userProfile?.state || '',
          city: userProfile?.city || '',
        });
        setComposerText('');
        setComposerImages([]);
        setComposerOpen(false);
      } finally {
        setComposerUploading(false);
      }
    };
  const { userProfile, user } = useAuth();
  const isBanned = !!userProfile?.banned;

  const state = userProfile?.state || '';

  const baseFiltered = useMemo(() => {
    if (!state) return [];
    return posts.filter(
      p => (p.state || '').toLowerCase() === state.toLowerCase() && p.chatRoom === 'state'
    );
  }, [posts, state]);

  const getEngagementScore = useCallback(post => {
    const now = new Date();
    const postDate = new Date(post.timestamp);
    const hoursSincePost = (now - postDate) / (1000 * 60 * 60);
    if (hoursSincePost > 24) return 0;
    const commentCount = post.comments?.length || 0;
    const likeCount = post.likes || 0;
    const engagementScore = likeCount + commentCount * 2;
    const decayFactor = Math.max(0, 1 - hoursSincePost / 24);
    return engagementScore * (1 + decayFactor * 0.2);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (typeof setActiveRoom === 'function') setActiveRoom('state');
      // Recompute order on focus (acts like refresh)
      try {
        const sorted = [...baseFiltered].sort((a, b) => {
          if (sortBy === 'relevant') {
            return getEngagementScore(b) - getEngagementScore(a);
          } else {
            return b.timestamp - a.timestamp;
          }
        });
        setOrderedIds(sorted.map(p => p.id));
      } catch {}
    }, [setActiveRoom])
  );

  useEffect(() => {
    const sorted = [...baseFiltered].sort((a, b) => {
      if (sortBy === 'relevant') {
        return getEngagementScore(b) - getEngagementScore(a);
      } else {
        return b.timestamp - a.timestamp;
      }
    });
    setOrderedIds(sorted.map(p => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const idToPost = new Map(baseFiltered.map(p => [p.id, p]));
  const displayPosts = orderedIds.map(id => idToPost.get(id)).filter(Boolean);
  const missing = baseFiltered.filter(p => !orderedIds.includes(p.id));
  const finalPosts = [...displayPosts, ...missing];

  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      onPress={() => navigation.navigate('Comments', { postId: item.id })}
      onLike={() => likePost(item.id)}
      onDelete={() => deletePost(item.id)}
      userCanDelete={user && (item.userId === user.uid)}
    />
  );

  return (
    <AppShell title="FencePost (State)" fullWidth>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.sortWrap}>
            <Pressable
              onPress={() => setSortOpen(v => !v)}
              style={styles.sortTrigger}
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
            >
              <Text style={styles.sortTriggerText}>
                {sortBy === 'relevant' ? 'Relevant' : 'Recent'} ▼
              </Text>
            </Pressable>
            {sortOpen && (
              <View style={styles.sortMenu}>
                <TouchableOpacity
                  style={styles.sortMenuItem}
                  onPress={() => {
                    setSortBy('relevant');
                    setSortOpen(false);
                  }}
                >
                  <Text style={styles.sortMenuText}>Relevant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortMenuItem}
                  onPress={() => {
                    setSortBy('recent');
                    setSortOpen(false);
                  }}
                >
                  <Text style={styles.sortMenuText}>Recent</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.quickPostWrap}>
            <Pressable
              style={[styles.quickPostButton, isBanned && styles.disabledButton]}
              onPress={isBanned ? undefined : () => setComposerOpen(true)}
              accessibilityLabel="Compose state post"
              accessibilityHint="Write a post!"
              testID="state-compose-open"
              title={isBanned ? 'Posting disabled (banned)' : 'Write a post!'}
              disabled={isBanned}
            >
              <Image
                source={require('../../../assets/newpen.png')}
                style={styles.quickPostIcon}
                resizeMode="contain"
              />
            </Pressable>
            {isBanned && (
              <View style={styles.bannedChip} pointerEvents="none" testID="state-banned-chip">
                <Text style={styles.bannedChipText}>Posting disabled</Text>
              </View>
            )}
          </View>
          <View style={styles.topBarRightInfo}>
            <Text style={styles.topBarTitle}>What's happening in your area</Text>
            <Text style={styles.topBarSubtitle}>
              {userProfile?.city ? `${userProfile.city}, ${state}` : state}
            </Text>
          </View>
        </View>

        <Modal visible={composerOpen && !isBanned} transparent animationType="fade" onRequestClose={() => setComposerOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setComposerOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>New State Post</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Write your post…"
                value={composerText}
                onChangeText={setComposerText}
                multiline
                autoFocus
              />
              {composerImages.length > 0 && (
                <ScrollView horizontal style={styles.modalImageRow} contentContainerStyle={styles.modalImageRowInner}>
                  {composerImages.map((uri, index) => (
                    <View key={`${uri?.uri || index}-${index}`} style={styles.modalImageWrap}>
                      <Image source={{ uri: uri?.uri }} style={styles.modalImage} />
                      <TouchableOpacity style={styles.modalImageRemove} onPress={() => handleRemoveComposerImage(index)} accessibilityLabel="Remove photo">
                        <Text style={styles.modalImageRemoveText}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <View style={styles.modalTools}>
                <TouchableOpacity style={styles.modalPhotoButton} onPress={handlePickComposerImage} testID="state-compose-addphoto">
                  <Text style={styles.modalPhotoButtonText}>Add Photo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => !composerUploading && setComposerOpen(false)} disabled={composerUploading}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalPostButton]} onPress={handleSubmitComposer} disabled={composerUploading}>
                  {composerUploading ? (
                    <ActivityIndicator size="small" color="#2D5016" />
                  ) : (
                    <Text style={styles.modalPostText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {finalPosts.length > 0 ? (
          <FlatList
            data={finalPosts}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Posts from {state} will appear here.</Text>
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    zIndex: 2000,
  },
  quickPostWrap: { position: 'relative' },
  sortDropdownContainer: {
    display: 'none',
  },
  sortDropdown: {
    height: 24,
  },
  sortWrap: { position: 'relative', zIndex: 3000 },
  sortTrigger: { paddingHorizontal: 8, paddingVertical: 4 },
  sortTriggerText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#2D5016',
  },
  sortMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    zIndex: 4000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sortMenuItem: { paddingHorizontal: 10, paddingVertical: 8 },
  sortMenuText: { fontFamily: fonts.bold, fontSize: 12, color: '#2D5016' },
  
  quickPostButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  disabledButton: {
    opacity: 0.5,
  },
  quickPostIcon: {
    width: 60,
    height: 60,
  },
  bannedChip: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 1000,
  },
  bannedChipText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '700',
  },
  topBarRightInfo: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D5016',
    fontFamily: fonts.extrabold,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: fonts.semibold,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2D5016',
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#2D5016',
    fontFamily: fonts.extrabold,
    marginBottom: 10,
  },
  modalInput: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#2D5016',
    padding: 10,
    fontSize: 15,
    lineHeight: 20,
    color: '#2C2C2C',
    fontFamily: fonts.regular,
  },
  modalTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  modalPhotoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2D5016',
    backgroundColor: '#ACD1AF',
    borderRadius: 6,
  },
  modalPhotoButtonText: {
    color: '#2D5016',
    fontWeight: '700',
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  modalImageRow: {
    marginTop: 10,
  },
  modalImageRowInner: {
    gap: 10,
    paddingHorizontal: 6,
  },
  modalImageWrap: {
    position: 'relative',
  },
  modalImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  modalImageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  modalImageRemoveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  modalCancelButton: {
    backgroundColor: '#FFFFFF',
  },
  modalPostButton: {
    backgroundColor: '#ACD1AF',
  },
  modalCancelText: {
    color: '#2D5016',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    fontFamily: fonts.bold,
  },
  modalPostText: {
    color: '#2D5016',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    fontFamily: fonts.bold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
});
