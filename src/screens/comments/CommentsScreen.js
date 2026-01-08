import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { usePost } from '../../context/PostContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import AppShell from '../../layout/AppShell';
import CommentComposer from '../../components/comments/CommentComposer';

export default function CommentsScreen({ route, navigation }) {
  const postId = route?.params?.postId;
  const {
    posts,
    addComment,
    addReply,
    likeComment,
    userInteractions,
    fetchCommentsForPost,
  } = usePost();
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [post, setPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const fetchedPostForIdRef = useRef(null);
  const commentsListRef = useRef(null);
  const inputRef = useRef(null);
  const [composerHeight, setComposerHeight] = useState(112);
  const { userProfile } = useAuth();
  const isBanned = !!userProfile?.banned;

  useEffect(() => {
    fetchedPostForIdRef.current = null;
  }, [postId]);

  useEffect(() => {
    let cancelled = false;

    if (!postId) {
      setPost(null);
      setLoadingPost(false);
      return () => {
        cancelled = true;
      };
    }

    const loadPost = async () => {
      const postFromContext = posts?.find(p => p.id === postId);
      if (postFromContext) {
        setPost(postFromContext);
        setLoadingPost(false);
        return;
      }

      if (fetchedPostForIdRef.current === postId) {
        setLoadingPost(false);
        return;
      }

      setLoadingPost(true);
      fetchedPostForIdRef.current = postId;

      try {
        const snap = await getDoc(doc(db, 'posts', postId));
        if (cancelled) return;

        if (!snap.exists()) {
          setPost(null);
          return;
        }

        const data = snap.data();
        setPost({
          id: snap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(),
        });
      } catch (e) {
        console.error('Error loading post:', e);
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoadingPost(false);
      }
    };

    loadPost();

    return () => {
      cancelled = true;
    };
  }, [postId, posts]);

  // Fetch comments when component mounts
  useEffect(() => {
    if (!postId) return;
    const loadComments = async () => {
      setLoadingComments(true);
      const fetchedComments = await fetchCommentsForPost(postId);
      console.log('Fetched comments:', fetchedComments);
      console.log('Number of comments:', fetchedComments.length);
      setComments(fetchedComments);
      setLoadingComments(false);
    };

    loadComments();
  }, [postId]);

  if (!postId) {
    return (
      <AppShell title="Comments">
        <View style={styles.container}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>Back</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={styles.loadingText}>Missing post id</Text>
          </View>
        </View>
      </AppShell>
    );
  }

  useEffect(() => {
    if (!replyTarget) return;
    let cancelled = false;

    const focusComposer = () => {
      if (cancelled) return;
      inputRef.current?.focus?.();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focusComposer);
    } else {
      setTimeout(focusComposer, 0);
    }

    // Ensure focus within ~100ms on web + mobile.
    const t = setTimeout(focusComposer, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [replyTarget, comments.length]);

  if (loadingPost) {
    return (
      <AppShell title="Comments">
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title="Comments">
        <View style={styles.container}>
          <Text style={styles.loadingText}>Post not found</Text>
        </View>
      </AppShell>
    );
  }

  const formatTime = timestamp => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleAddComment = async () => {
    if (isBanned) return;
    if (!commentText.trim()) return;

    if (replyTarget?.commentId) {
      await addReply(postId, replyTarget.commentId, commentText);
      setReplyTarget(null);
    } else {
      await addComment(postId, commentText);
    }

    setCommentText('');

    // Refresh comments
    const fetchedComments = await fetchCommentsForPost(postId);
    setComments(fetchedComments);
  };

  const handleLike = async commentId => {
    if (isBanned) return;
    await likeComment(postId, commentId);
    const fetchedComments = await fetchCommentsForPost(postId);
    setComments(fetchedComments);
  };

  const startReply = (commentId, username) => {
    if (isBanned) return;
    setReplyTarget({ commentId, username: username || '' });
    setCommentText('');
    // Focus in/near the user gesture for best web reliability.
    inputRef.current?.focus?.();

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => inputRef.current?.focus?.());
    }

    setTimeout(() => {
      inputRef.current?.focus?.();
    }, 80);
  };

  const renderReply = (reply, depth = 1) => (
    <View
      key={reply.id}
      style={[styles.replyCard, { marginLeft: depth > 1 ? 10 : 0 }]}
      testID={`reply-card-${reply.id}`}
    >
      <View style={styles.commentHeader}>
        <Text style={styles.commentUser}>
          {reply.username || 'Anonymous Farmer'}
        </Text>
        <Text style={styles.commentTime}>{formatTime(reply.timestamp)}</Text>
      </View>
      <Text style={styles.commentText} testID={`reply-text-${reply.id}`}>
        {reply.text}
      </Text>
      <View style={styles.commentActions}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            (userInteractions?.likedComments || []).includes(reply.id) &&
              styles.voteButtonActive,
          ]}
          onPress={() => handleLike(reply.id)}
          testID={`comment-like-${reply.id}`}
        >
          <Text
            style={[
              styles.voteText,
              (userInteractions?.likedComments || []).includes(reply.id) &&
                styles.voteTextActive,
            ]}
          >
            Like {reply.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => {
            startReply(reply.id, reply.username || '');
          }}
          testID={`comment-reply-${reply.id}`}
        >
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
      </View>

      {/* Nested Replies */}
      {reply.replies && reply.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {reply.replies.map(nestedReply =>
            renderReply(nestedReply, depth + 1)
          )}
        </View>
      )}
    </View>
  );

  const renderComment = ({ item }) => {
    console.log('Rendering comment:', item);
    return (
      <View style={styles.commentCard} testID={`comment-card-${item.id}`}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>
            {item.username || 'Anonymous Farmer'}
          </Text>
          <Text style={styles.commentTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={styles.commentText} testID={`comment-text-${item.id}`}>
          {item.text}
        </Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              (userInteractions?.likedComments || []).includes(item.id) &&
                styles.voteButtonActive,
            ]}
            onPress={() => handleLike(item.id)}
            testID={`comment-like-${item.id}`}
          >
            <Text
              style={[
                styles.voteText,
                (userInteractions?.likedComments || []).includes(item.id) &&
                  styles.voteTextActive,
              ]}
            >
              Like {item.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              startReply(item.id, item.username || '');
            }}
            testID={`comment-reply-${item.id}`}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {/* Replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map(reply => renderReply(reply, 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <AppShell title="Comments" fullWidth>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : Platform.OS === 'android'
              ? 'height'
              : undefined
        }
      >
        {/* Pinned Back Arrow Row */}
        <View style={styles.pinnedTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backIconButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="comments-back"
          >
            <Text style={styles.backIconText}>{'<'}</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content: Comments FlatList */}
        <View style={styles.commentsSection}>
          <FlatList
            ref={commentsListRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            style={styles.commentsList}
            contentContainerStyle={[
              styles.commentsListContent,
              { paddingTop: 60 },
              { paddingBottom: Math.max(24, composerHeight + 16) },
            ]}
            keyboardShouldPersistTaps="always"
            ListEmptyComponent={
              loadingComments ? (
                <Text style={styles.loadingText}>Loading comments...</Text>
              ) : (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsText}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtext}>
                    Be the first to comment!
                  </Text>
                </View>
              )
            }
          />
        </View>

        {/* Sticky Footer: Composer */}
        <View
          onLayout={e => {
            const h = e?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h > 0) setComposerHeight(h);
          }}
        >
          {isBanned && (
            <View style={styles.bannedBanner} testID="comments-banned-banner">
              <Text style={styles.bannedBannerText}>
                Commenting disabled for banned accounts
              </Text>
            </View>
          )}
          <CommentComposer
            value={commentText}
            onChangeText={setCommentText}
            onSend={handleAddComment}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
            inputRef={inputRef}
            disabled={isBanned}
          />
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 50,
  },
  pinnedTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  backIconButton: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  backIconText: {
    fontSize: 22,
    lineHeight: 22,
    color: '#2D5016',
    fontWeight: '800',
  },
  commentsSection: {
    flex: 1,
    backgroundColor: 'white',
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 24,
  },
  commentCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
    borderLeftWidth: 3,
    borderLeftColor: '#81C784',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commentUser: {
    fontSize: 15,
    fontWeight: '700',
    color: '#155724',
  },
  commentTime: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  commentText: {
    fontSize: 15,
    color: '#212529',
    lineHeight: 22,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  voteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  voteButtonActive: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  voteText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  voteTextActive: {
    color: '#155724',
    fontWeight: '700',
  },
  replyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  replyButtonText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '700',
  },
  bannedBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
  },
  bannedBannerText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '700',
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#dee2e6',
  },
  replyCard: {
    paddingVertical: 12,
  },
  noComments: {
    padding: 50,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 17,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '600',
  },
  noCommentsSubtext: {
    fontSize: 15,
    color: '#adb5bd',
  },
  inputSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  replyingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#c3e6cb',
  },
  replyingText: {
    fontSize: 14,
    color: '#155724',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  cancelReply: {
    fontSize: 20,
    color: '#155724',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  sendButton: {
    backgroundColor: '#155724',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
