import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { usePost } from '../../context/PostContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/adminUtils';
import AppShell from '../../layout/AppShell';
import PostCard from '../../components/PostCard';
import { fonts } from '../../theme/fonts';
import { uploadMultipleImages } from '../../utils/imageUpload';
import { useFocusEffect } from '@react-navigation/native';

export default function FeedScreen({ navigation }) {
  const [sortBy, setSortBy] = useState('relevant'); // 'relevant' or 'recent'
  const [sortOpen, setSortOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerImages, setComposerImages] = useState([]);
  const [composerUploading, setComposerUploading] = useState(false);
  const {
    posts,
    postsError,
    loading: postsLoading,
    addPost,
    deletePost,
    likePost,
    userInteractions,
    setActiveRoom,
  } = usePost();
  // Ensure national room whenever the Feed screen is focused
  useFocusEffect(
    useCallback(() => {
      if (typeof setActiveRoom === 'function') setActiveRoom('national');
      // Recompute order on screen focus to allow refresh-style reordering
      try {
        const base = posts.filter(
          p => p.chatRoom === 'all' || p.chatRoom === 'national'
        );
        const sorted = [...base].sort((a, b) => {
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
  const { userProfile, user } = useAuth();
  const isBanned = !!userProfile?.banned;
  const [stateBoardHovered, setStateBoardHovered] = useState(false);
  const [quickPostHovered, setQuickPostHovered] = useState(false);

  // Posts now come from PostContext
  const mockPosts = [
    {
      id: '1',
      type: 'simple',
      text: 'First day of planting is always exciting! Weather looks perfect this week.',
      chatRoom: 'regional',
      timestamp: new Date(Date.now() - 3600000),
      images: [],
    },
    {
      id: '2',
      type: 'fencepost',
      activity: 'planting',
      chatRoom: 'regional',
      data: {
        crop: 'Corn',
        variety: 'Pioneer 1234',
        population: '32000',
        rowWidth: '30',
      },
      timestamp: new Date(Date.now() - 7200000),
      images: [],
    },
    {
      id: '3',
      type: 'simple',
      text: 'Rain coming in tomorrow, had to finish up the west field today.',
      chatRoom: 'statewide',
      timestamp: new Date(Date.now() - 10800000),
      images: [],
    },
  ];

  // Calculate engagement score for relevance sorting
  const getEngagementScore = post => {
    const now = new Date();
    const postDate = new Date(post.timestamp);
    const hoursSincePost = (now - postDate) / (1000 * 60 * 60);

    // Only consider posts from today (last 24 hours)
    if (hoursSincePost > 24) return 0;

    const commentCount = post.comments?.length || 0;
    const likeCount = post.likes || 0;

    // Engagement score: likes + (comments * 2) to weight comments more
    // Decay factor: newer posts get a slight boost
    const engagementScore = likeCount + commentCount * 2;
    const decayFactor = Math.max(0, 1 - hoursSincePost / 24);

    return engagementScore * (1 + decayFactor * 0.2);
  };

  // Base filtered posts (no reordering on likes)
  const baseFiltered = posts.filter(
    post => post.chatRoom === 'all' || post.chatRoom === 'national'
  );

  // Recompute ordering only when sort changes (not on like updates)
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

  // Compose display list using stable orderedIds mapping to latest post data
  const idToPost = new Map(baseFiltered.map(p => [p.id, p]));
  const displayPosts = orderedIds
    .map(id => idToPost.get(id))
    .filter(Boolean);
  // Append any new posts not in orderedIds to the end without reordering existing
  const missing = baseFiltered.filter(p => !orderedIds.includes(p.id));
  const finalPosts = [...displayPosts, ...missing];

  const submitSimplePost = (text, images = []) => {
    if (!text.trim()) {
      alert('Please enter some text');
      return false;
    }

    addPost({
      type: 'simple',
      text,
      chatRoom: 'national',
      images,
      username: userProfile?.username || null,
      state: userProfile?.state || '',
      city: userProfile?.city || '',
    });

    return true;
  };

  const handleOpenComposer = () => {
    setComposerOpen(true);
  };

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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const handleSubmitComposer = () => {
    if (composerUploading) return;

    (async () => {
      setComposerUploading(true);
      try {
        let imageUrls = [];
        if (composerImages.length > 0) {
          imageUrls = await uploadMultipleImages(
            composerImages
              .map(a =>
                a?.file ? a.file : a?.uploadUri ? a.uploadUri : a?.uri
              )
              .filter(Boolean),
            'posts'
          );
        }

        const ok = submitSimplePost(composerText, imageUrls);
        if (!ok) return;

        setComposerText('');
        setComposerImages([]);
        setComposerOpen(false);
      } catch (e) {
        console.error('Composer post error:', e);
        const msg = e?.message
          ? String(e.message)
          : 'Failed to post. Please try again.';
        const code = e?.code ? String(e.code) : null;
        alert(
          code ? `Failed to post: ${msg} (${code})` : `Failed to post: ${msg}`
        );
      } finally {
        setComposerUploading(false);
      }
    })();
  };

  const handleDeletePost = async postId => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(postId);
        alert('Post deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete post: ' + error.message);
      }
    }
  };

  

  const renderPost = ({ item }) => {
    const userCanDelete = user && (item.userId === user.uid || isAdmin(user));

    return (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('Comments', { postId: item.id })}
        onLike={() => likePost(item.id)}
        onDelete={() => handleDeletePost(item.id)}
        onImagePress={uri => {
          // Future: open image modal viewer
          console.log('Image pressed:', uri);
        }}
        userCanDelete={userCanDelete}
      />
    );
  };

  return (
    <AppShell title="Feed" fullWidth>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {/* Sort Dropdown */}
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
              onPress={isBanned ? undefined : handleOpenComposer}
              accessibilityLabel="Compose post"
              testID="feed-compose-open"
              onHoverIn={() => setQuickPostHovered(true)}
              onHoverOut={() => setQuickPostHovered(false)}
              title={isBanned ? 'Posting disabled (banned)' : 'Write a post!'}
              accessibilityHint={isBanned ? 'Posting disabled (banned)' : 'Write a post!'}
              disabled={isBanned}
            >
              <Image
                source={require('../../../assets/newpen.png')}
                style={styles.quickPostIcon}
                resizeMode="contain"
              />
            </Pressable>
            {quickPostHovered && !isBanned && (
              <View style={styles.tooltipBelow} pointerEvents="none">
                <Text style={styles.tooltipText}>Write a post!</Text>
              </View>
            )}
            {isBanned && (
              <View style={styles.bannedChip} pointerEvents="none" testID="feed-banned-chip">
                <Text style={styles.bannedChipText}>Posting disabled</Text>
              </View>
            )}
          </View>

          <View style={styles.stateBoardWrap}>
            <Pressable
              style={styles.stateBoardButton}
              onPress={() => navigation.navigate('FencePostBoard')}
              accessibilityLabel="Open state FencePost board"
              testID="feed-open-stateboard"
              onHoverIn={() => setStateBoardHovered(true)}
              onHoverOut={() => setStateBoardHovered(false)}
              title="look over the fencepost"
              accessibilityHint="look over the fencepost"
            >
              <Image
                source={require('../../../assets/2.png')}
                style={styles.stateBoardIcon}
                resizeMode="contain"
              />
            </Pressable>
            {stateBoardHovered && (
              <View style={styles.tooltipBelow} pointerEvents="none">
                <Text style={styles.tooltipText}>look over the fencepost</Text>
              </View>
            )}
          </View>
        </View>

        <Modal
          visible={composerOpen && !isBanned}
          transparent
          animationType="fade"
          onRequestClose={() => setComposerOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setComposerOpen(false)}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Write your post…"
                value={composerText}
                onChangeText={setComposerText}
                multiline
                autoFocus
              />

              {composerImages.length > 0 && (
                <ScrollView
                  horizontal
                  style={styles.modalImageRow}
                  contentContainerStyle={styles.modalImageRowInner}
                >
                  {composerImages.map((uri, index) => (
                    <View
                      key={`${uri?.uri || index}-${index}`}
                      style={styles.modalImageWrap}
                    >
                      <Image
                        source={{ uri: uri?.uri }}
                        style={styles.modalImage}
                      />
                      <TouchableOpacity
                        style={styles.modalImageRemove}
                        onPress={() => handleRemoveComposerImage(index)}
                        accessibilityLabel="Remove photo"
                      >
                        <Text style={styles.modalImageRemoveText}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalTools}>
                <TouchableOpacity
                  style={styles.modalPhotoButton}
                  onPress={handlePickComposerImage}
                  testID="feed-compose-addphoto"
                >
                  <Text style={styles.modalPhotoButtonText}>Add Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => !composerUploading && setComposerOpen(false)}
                  disabled={composerUploading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPostButton]}
                  onPress={handleSubmitComposer}
                  disabled={composerUploading}
                  testID="feed-compose-submit"
                >
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

        {/* Feed Content */}
        {postsError ? (
            <View style={styles.feedContainer}>
              <Text style={styles.emptyText}>Couldn't load posts</Text>
              <Text style={styles.emptySubtext}>{postsError}</Text>
            </View>
          ) : postsLoading ? (
            <View style={styles.feedContainer}>
              <Text style={styles.emptyText}>Loading posts…</Text>
            </View>
          ) : finalPosts.length > 0 ? (
            <FlatList
              data={finalPosts}
              renderItem={renderPost}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.feedList}
            />
          ) : (
            <View style={styles.feedContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Be the first to post!</Text>
            </View>
          )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8', // Theme bg color for feed background
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
  quickPostWrap: {
    position: 'relative',
    zIndex: 999,
  },
  stateBoardWrap: {
    position: 'relative',
    zIndex: 999,
  },
  sortDropdownContainer: {
    display: 'none',
  },
  sortDropdown: {
    height: 24,
  },
  sortWrap: {
    position: 'relative',
    zIndex: 3000,
  },
  sortTrigger: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
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
  sortMenuItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sortMenuText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#2D5016',
  },
  sortBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 0,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'transparent',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2D5016',
    minWidth: 120,
    flex: 1,
    maxWidth: 200,
    overflow: 'hidden',
  },
  dropdown: {
    height: 32,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#2D5016',
  },
  feedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  feedList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  postCard: {
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 8,
    padding: 12,
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8F5E9',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
    position: 'relative',
    cursor: 'pointer',
  },
  postCardHovered: {
    backgroundColor: '#E8F5E9',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5016',
    letterSpacing: 0.2,
  },
  postType: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6c757d',
    letterSpacing: 0.2,
    marginRight: 2,
  },
  fencePostType: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D5016',
    letterSpacing: 0.2,
    marginRight: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  postText: {
    fontSize: 15,
    color: '#2C2C2C',
    lineHeight: 24,
  },
  fencePostContentRow: {
    flexDirection: 'column',
    gap: 12,
  },
  fencePostData: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  rightColumn: {
    gap: 12,
  },
  fencePostImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  locationButton: {
    backgroundColor: '#ACD1AF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  locationText: {
    color: '#2D5016',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
    minWidth: 100,
    flex: 1,
    textTransform: 'capitalize',
  },
  dataValue: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  tooltipBelow: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: '50%',
    transform: [{ translateX: -80 }],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5016',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tooltipText: {
    color: '#2D5016',
    fontSize: 12,
    fontFamily: fonts.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  postFooterPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
  },
  primaryActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryActionButtonHover: {
    backgroundColor: 'rgba(45,80,22,0.07)',
  },
  primaryActionButtonPressed: {
    backgroundColor: 'rgba(45,80,22,0.10)',
  },
  primaryActionText: {
    fontSize: 12,
    color: '#2D5016',
    fontWeight: '700',
  },
  iconActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  thumbIconMuted: {
    opacity: 0.55,
  },
  iconActionText: {
    fontSize: 12,
    color: '#2D5016',
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  deleteButtonHover: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  deleteText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  iconActionTextMuted: {
    color: '#6c757d',
    fontWeight: '600',
  },
  quickPostInput: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    fontSize: 15,
    lineHeight: 16,
    maxHeight: 36,
    borderWidth: 0,
    color: '#2C2C2C',
    fontFamily: fonts.regular,
    fontWeight: '400',
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
  modalImageRow: {
    marginTop: 10,
  },
  modalImageRowInner: {
    gap: 10,
  },
  modalImageWrap: {
    position: 'relative',
  },
  modalImage: {
    width: 84,
    height: 84,
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  modalImageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  modalImageRemoveText: {
    color: '#2D5016',
    fontWeight: '800',
    fontFamily: fonts.extrabold,
  },
  modalTools: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  modalPhotoButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2D5016',
    backgroundColor: '#FFFFFF',
  },
  modalPhotoButtonText: {
    color: '#2D5016',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    fontFamily: fonts.bold,
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
  quickPostButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0,
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
  stateBoardButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stateBoardIcon: {
    width: 42,
    height: 42,
  },
  quickPostButtonText: {
    color: '#2D5016',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: fonts.bold,
  },
  topCommentsSection: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 6,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  previewComment: {
    marginBottom: 10,
  },
  previewCommentText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 6,
    lineHeight: 20,
  },
  previewCommentUser: {
    fontWeight: '700',
    color: '#2D5016',
  },
  previewCommentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  previewStat: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  costPerAcreLabel: {
    fontWeight: '700',
    color: '#2D5016',
  },
  costPerAcreValue: {
    fontWeight: '700',
    color: '#2D5016',
  },
  rainGaugeIcon: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#2D5016',
  },
  rainGaugeContent: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  rainGaugeMain: {
    backgroundColor: '#e3f2fd',
    padding: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    borderWidth: 2,
    borderColor: '#90caf9',
  },
  rainGaugeAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0277bd',
  },
  rainGaugeDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
  },
  rainGaugeLocation: {
    backgroundColor: '#155724',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rainGaugeLocationText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rainGaugeNotes: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rainGaugeNotesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6c757d',
    marginBottom: 6,
  },
  rainGaugeNotesText: {
    fontSize: 15,
    color: '#212529',
    lineHeight: 22,
  },
  commentsView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  commentsPinnedTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  commentsTopRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  commentsBackIconButton: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  commentsBackIconText: {
    fontSize: 22,
    lineHeight: 22,
    color: '#2D5016',
    fontWeight: '800',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6c757d',
  },
  commentsLoadingText: {
    textAlign: 'center',
    marginTop: 84,
    fontSize: 16,
    color: '#6c757d',
  },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  commentItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5016',
    opacity: 0.85,
    marginBottom: 6,
  },
  commentText: {
    fontSize: 16,
    color: '#2C2C2C',
    lineHeight: 24,
    marginBottom: 10,
  },
  commentTime: {
    fontSize: 11,
    color: '#6c757d',
    opacity: 0.7,
    marginTop: 2,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  commentActionButton: {
    paddingVertical: 6,
  },
  commentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5016',
    opacity: 0.75,
  },
  commentActionTextActive: {
    opacity: 1,
  },
  repliesContainer: {
    marginTop: 12,
  },
  replyItem: {
    marginTop: 12,
    paddingLeft: 12,
  },
  replyItemNested: {
    paddingLeft: 20,
  },
  replyingToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: '#6c757d',
  },
  replyingToCancel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D5016',
    opacity: 0.8,
  },
  noCommentsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginTop: 40,
  },
  commentInputContainer: {
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5E9',
    gap: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 80,
    borderWidth: 0,
    color: '#2C2C2C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  commentInputDisabled: {
    opacity: 0.6,
  },
  commentInputWeb: {
    resize: 'none',
    outlineStyle: 'none',
  },
  bannedBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannedBannerText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '700',
  },
  sendCommentButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8F5E9',
  },
  sendButtonText: {
    color: '#2D5016',
    fontWeight: '600',
    fontSize: 13,
    opacity: 0.8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
