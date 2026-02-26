import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postsService } from '../../services/posts.service';
import { PostCard } from '../../components/PostCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Colors, Spacing, FontSizes } from '../../constants/theme';

const MAX_COMMENT_LENGTH = 300;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [commentText, setCommentText] = useState('');
  const [postUpdateTrigger, setPostUpdateTrigger] = useState(0);
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments, isRefetching: isRefetchingComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => postsService.getComments(id, 1, 50),
  });

  const comments = commentsData?.data || [];

  const commentMutation = useMutation({
    mutationFn: (content: string) => postsService.createComment(id, { content }),
    onSuccess: (newComment) => {
      // Add the new comment to the comments list
      queryClient.setQueryData(['comments', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: [newComment, ...old.data],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1
          }
        };
      });

      // Update the post's comment count in all post caches
      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ queryKey: ['posts'] });
      for (const query of queries) {
        queryClient.setQueryData(query.queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((p: any) =>
                p.id === id
                  ? { ...p, commentCount: p.commentCount + 1 }
                  : p
              ),
            })),
          };
        });
      }

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      setCommentText('');
    },
  });

  const handleComment = () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (commentText.length > MAX_COMMENT_LENGTH) {
      Alert.alert('Error', `Comment must be less than ${MAX_COMMENT_LENGTH} characters`);
      return;
    }

    commentMutation.mutate(commentText.trim());
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Find the post from the cache (made reactive with useMemo)
  const post = useMemo(() => {
    // Check the main feed cache (empty searchQuery)
    const mainFeed = queryClient.getQueryData<any>(['posts', '']);
    if (mainFeed?.pages) {
      const foundPost = mainFeed.pages.flatMap((p: any) => p?.data || []).find((p: any) => p?.id === id);
      if (foundPost) return foundPost;
    }

    // Check filtered feed caches (try to find from all cached queries)
    const cache = queryClient.getQueryCache();
    const queries = cache.findAll({ queryKey: ['posts'] });
    for (const query of queries) {
      const data = query.state.data as any;
      if (data?.pages) {
        const foundPost = data.pages.flatMap((p: any) => p?.data || []).find((p: any) => p?.id === id);
        if (foundPost) return foundPost;
      }
    }

    return null;
  }, [queryClient, id, commentsData, postUpdateTrigger]); // Depend on postUpdateTrigger to trigger re-render when like changes

  if (!post && !commentsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <Text style={styles.errorSubtext}>Post ID: {id}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Post',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerShadowVisible: true,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.outerScrollView}
          contentContainerStyle={styles.outerScrollViewContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingComments}
              onRefresh={refetchComments}
            />
          }
        >
          <PostCard
            post={post}
            onPress={() => { }}
            onLikeChange={() => setPostUpdateTrigger((prev) => prev + 1)}
          />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={Colors.light.tint} />
            ) : comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{comment.author.username}</Text>
                    <Text style={styles.commentTimestamp}>
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || commentMutation.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={16} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  outerScrollView: {
    flex: 1,
  },
  outerScrollViewContent: {
    paddingBottom: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.light.error,
    marginBottom: Spacing.xs,
  },
  errorSubtext: {
    fontSize: FontSizes.sm,
    color: '#7c7c7c',
    textAlign: 'center',
  },
  commentsSection: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  commentsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  noComments: {
    fontSize: FontSizes.sm,
    color: '#7c7c7c',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  commentItem: {
    backgroundColor: Colors.light.cardBackground,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  commentUsername: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  commentTimestamp: {
    fontSize: FontSizes.xs,
    color: '#7c7c7c',
  },
  commentContent: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    marginTop: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
