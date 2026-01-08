import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  orderBy,
  getDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { isAdmin } from '../utils/adminUtils';

const PostContext = createContext({});

export const usePost = () => useContext(PostContext);

export const PostProvider = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [activeRoom, setActiveRoom] = useState('national');
  const defaultInteractions = {
    likedPosts: [],
    likedComments: [],
  };
  const [userInteractions, setUserInteractions] = useState(defaultInteractions);
  const [loading, setLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);

  // Fetch posts from Firestore
  useEffect(() => {
    // Wait until auth state is known. On web, this avoids subscribing while
    // unauthenticated (which causes a permission error and an empty feed until refresh).
    if (authLoading) {
      setLoading(true);
      setPostsError(null);
      return;
    }

    if (!user) {
      setPosts([]);
      setLoading(false);
      setPostsError(null);
      return;
    }

    setLoading(true);
    setPostsError(null);

    // Avoid composite-index requirements by subscribing to the latest posts globally,
    // then filtering client-side to the active room + the global "all" room.
    // This prevents a missing/slow-building composite index from blanking the feed.
    const feedQuery = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const normalize = snap =>
      snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          comments: [],
        };
      });

    const unsub = onSnapshot(
      feedQuery,
      snapshot => {
        const normalized = normalize(snapshot);
        const filtered = normalized.filter(post => post.chatRoom === activeRoom);
        setPosts(filtered.slice(0, 200));
        setLoading(false);
      },
      error => {
        console.error('Error fetching feed posts:', error);
        setPostsError(error?.message || 'Failed to load posts');
        setLoading(false);
      }
    );

    return () => {
      unsub?.();
    };
  }, [activeRoom, user, authLoading]);

  // Fetch user interactions
  useEffect(() => {
    if (!user) return;

    const fetchInteractions = async () => {
      try {
        const interactionsDoc = await getDoc(
          doc(db, 'userInteractions', user.uid)
        );
        if (interactionsDoc.exists()) {
          setUserInteractions({
            ...defaultInteractions,
            ...interactionsDoc.data(),
          });
        }
      } catch (error) {
        console.error('Error fetching interactions:', error);
      }
    };

    fetchInteractions();
  }, [user]);

  const addPost = async post => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      if (typeof alert === 'function') alert('Your account is banned and cannot post.');
      return;
    }

    try {
      const newPost = {
        ...post,
        userId: user.uid,
        timestamp: serverTimestamp(),
        likes: 0,
        commentCount: 0,
      };

      await addDoc(collection(db, 'posts'), newPost);
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  const createNotification = async ({
    recipientId,
    senderId,
    type,
    message,
    postId,
    parentCommentId,
  }) => {
    if (!recipientId || !senderId) return;
    if (recipientId === senderId) return;

    const payload = {
      recipientId,
      senderId,
      type,
      message,
      postId: postId || null,
      read: false,
      timestamp: serverTimestamp(),
    };
    if (parentCommentId) payload.parentCommentId = parentCommentId;

    await addDoc(collection(db, 'notifications'), payload);
  };

  const addComment = async (postId, commentText) => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      if (typeof alert === 'function') alert('Your account is banned and cannot comment.');
      return;
    }

    try {
      const username = userProfile?.username || userProfile?.name || null;
      const comment = {
        postId,
        userId: user.uid,
        username,
        text: commentText,
        timestamp: serverTimestamp(),
        likes: 0,
        parentCommentId: null,
      };

      console.log('Adding comment to Firestore:', comment);
      const docRef = await addDoc(collection(db, 'comments'), comment);
      console.log('Comment added with ID:', docRef.id);

      // Update post comment count
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
      });
      console.log('Post comment count updated');

      // Fetch post owner
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postOwnerId = postSnap.data().userId;
        if (postOwnerId !== user.uid) {
          // Fetch commenter username
          let commenterName =
            userProfile?.username || userProfile?.name || 'Someone';
          // Create notification for post owner
          await createNotification({
            recipientId: postOwnerId,
            senderId: user.uid,
            type: 'comment',
            message: `${commenterName} commented: ${commentText}`,
            postId,
          });
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const addReply = async (postId, parentCommentId, replyText) => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      if (typeof alert === 'function') alert('Your account is banned and cannot reply.');
      return;
    }

    try {
      const username = userProfile?.username || userProfile?.name || null;
      const reply = {
        postId,
        userId: user.uid,
        username,
        text: replyText,
        timestamp: serverTimestamp(),
        likes: 0,
        parentCommentId,
      };

      await addDoc(collection(db, 'comments'), reply);

      // Update post comment count
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
      });

      // Fetch parent comment owner
      const parentCommentRef = doc(db, 'comments', parentCommentId);
      const parentCommentSnap = await getDoc(parentCommentRef);
      if (parentCommentSnap.exists()) {
        const parentOwnerId = parentCommentSnap.data().userId;
        if (parentOwnerId !== user.uid) {
          // Fetch replier username
          let replierName =
            userProfile?.username || userProfile?.name || 'Someone';
          // Create notification for parent comment owner
          await createNotification({
            recipientId: parentOwnerId,
            senderId: user.uid,
            type: 'reply',
            message: `${replierName} replied: ${replyText}`,
            postId,
            parentCommentId,
          });
        }
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const likePost = async postId => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      if (typeof alert === 'function') alert('Your account is banned and cannot like posts.');
      return;
    }

    try {
      const alreadyLiked = (userInteractions?.likedPosts || []).includes(
        postId
      );

      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const postOwnerId = postSnap.exists() ? postSnap.data()?.userId : null;
      const newInteractions = { ...defaultInteractions, ...userInteractions };

      if (alreadyLiked) {
        // Remove like
        await updateDoc(postRef, { likes: increment(-1) });
        newInteractions.likedPosts = newInteractions.likedPosts.filter(
          id => id !== postId
        );
      } else {
        // Add like
        await updateDoc(postRef, { likes: increment(1) });
        newInteractions.likedPosts = [...newInteractions.likedPosts, postId];

        if (postOwnerId && postOwnerId !== user.uid) {
          const likerName =
            userProfile?.username || userProfile?.name || 'Someone';
          await createNotification({
            recipientId: postOwnerId,
            senderId: user.uid,
            type: 'like',
            message: `${likerName} liked your post`,
            postId,
          });
        }
      }

      // Update user interactions in Firestore
      await setDoc(doc(db, 'userInteractions', user.uid), newInteractions, {
        merge: true,
      });
      setUserInteractions(newInteractions);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const likeComment = async (_postId, commentId) => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      if (typeof alert === 'function') alert('Your account is banned and cannot like comments.');
      return;
    }

    try {
      const alreadyLiked = (userInteractions?.likedComments || []).includes(
        commentId
      );

      const commentRef = doc(db, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      const commentOwnerId = commentSnap.exists()
        ? commentSnap.data()?.userId
        : null;
      const commentPostId = commentSnap.exists()
        ? commentSnap.data()?.postId
        : null;
      const commentText = commentSnap.exists()
        ? commentSnap.data()?.text
        : null;
      const newInteractions = { ...defaultInteractions, ...userInteractions };

      if (alreadyLiked) {
        // Remove like
        await updateDoc(commentRef, { likes: increment(-1) });
        newInteractions.likedComments = newInteractions.likedComments.filter(
          id => id !== commentId
        );
      } else {
        // Add like
        await updateDoc(commentRef, { likes: increment(1) });
        newInteractions.likedComments = [
          ...newInteractions.likedComments,
          commentId,
        ];

        if (commentOwnerId && commentOwnerId !== user.uid) {
          const likerName =
            userProfile?.username || userProfile?.name || 'Someone';
          const snippet = commentText
            ? `: ${String(commentText).slice(0, 80)}`
            : '';
          await createNotification({
            recipientId: commentOwnerId,
            senderId: user.uid,
            type: 'like',
            message: `${likerName} liked your comment${snippet}`,
            postId: commentPostId,
            parentCommentId: commentId,
          });
        }
      }

      await setDoc(doc(db, 'userInteractions', user.uid), newInteractions, {
        merge: true,
      });
      setUserInteractions(newInteractions);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const deletePost = async postId => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      throw new Error('Banned users cannot delete posts');
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);

      // Verify the user owns this post or is admin
      if (
        !postDoc.exists() ||
        (postDoc.data().userId !== user.uid && !isAdmin(user))
      ) {
        throw new Error('Unauthorized to delete this post');
      }

      // Delete all comments associated with this post
      const commentsSnapshot = await getDocs(
        query(collection(db, 'comments'), where('postId', '==', postId))
      );

      const deletePromises = commentsSnapshot.docs.map(commentDoc =>
        deleteDoc(doc(db, 'comments', commentDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the post
      await deleteDoc(postRef);

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  };

  const deleteComment = async (postId, commentId) => {
    if (!user) return;
    if (userProfile?.banned && !isAdmin(user)) {
      throw new Error('Banned users cannot delete comments');
    }

    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);

      // Verify the user owns this comment or is admin
      if (
        !commentDoc.exists() ||
        (commentDoc.data().userId !== user.uid && !isAdmin(user))
      ) {
        throw new Error('Unauthorized to delete this comment');
      }

      // Delete all replies to this comment
      const repliesSnapshot = await getDocs(
        query(
          collection(db, 'comments'),
          where('parentCommentId', '==', commentId)
        )
      );

      const deletePromises = repliesSnapshot.docs.map(replyDoc =>
        deleteDoc(doc(db, 'comments', replyDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the comment
      await deleteDoc(commentRef);

      // Update post comment count
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-(1 + repliesSnapshot.size)),
      });

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  const fetchCommentsForPost = async postId => {
    try {
      console.log('Fetching comments for post:', postId);
      // Keep this query simple to avoid composite-index requirements.
      // We'll sort client-side by timestamp.
      const allSnapshot = await getDocs(
        query(
          collection(db, 'comments'),
          where('postId', '==', postId),
          limit(500)
        )
      );

      const byId = new Map();
      const all = allSnapshot.docs.map(commentDoc => {
        const data = commentDoc.data();
        const normalized = {
          id: commentDoc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          likes: typeof data.likes === 'number' ? data.likes : 0,
          dislikes: typeof data.dislikes === 'number' ? data.dislikes : 0,
          replies: [],
        };
        byId.set(normalized.id, normalized);
        return normalized;
      });

      // Attach to parents (supports nested replies).
      const topLevel = [];
      for (const item of all) {
        const parentId = item.parentCommentId;
        if (parentId && byId.has(parentId)) {
          byId.get(parentId).replies.push(item);
        } else {
          topLevel.push(item);
        }
      }

      const sortReplies = node => {
        if (!node.replies?.length) return;
        node.replies.sort(
          (a, b) =>
            (a.timestamp?.getTime?.() || 0) - (b.timestamp?.getTime?.() || 0)
        );
        node.replies.forEach(sortReplies);
      };
      topLevel.sort(
        (a, b) =>
          (a.timestamp?.getTime?.() || 0) - (b.timestamp?.getTime?.() || 0)
      );
      topLevel.forEach(sortReplies);

      return topLevel;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  return (
    <PostContext.Provider
      value={{
        posts,
        postsError,
        activeRoom,
        setActiveRoom,
        addPost,
        deletePost,
        deleteComment,
        addComment,
        addReply,
        likeComment,
        likePost,
        userInteractions,
        loading,
        fetchCommentsForPost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};
