import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SimpleLineIcons, FontAwesome } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { postsService } from '../services/posts.service';
import * as Haptics from 'expo-haptics';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
  };
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
}

interface PostCardProps {
  post: Post;
  onComment?: () => void;
  onPress?: () => void;
  onLikeChange?: () => void;
}

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

const updatePostInCache = (old: any, postId: string) => {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page: any) => ({
      ...page,
      data: page.data.map((p: any) =>
        p.id === postId
          ? {
              ...p,
              isLikedByMe: !p.isLikedByMe,
              likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      ),
    })),
  };
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onComment,
  onPress,
  onLikeChange,
}) => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: postsService.toggleLike,
    onMutate: async (postId) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot all post caches for rollback
      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ queryKey: ['posts'] });
      const previousCaches = queries.map((q) => ({
        queryKey: q.queryKey,
        data: q.state.data,
      }));

      // Optimistically update all post caches immediately
      for (const query of queries) {
        queryClient.setQueryData(query.queryKey, (old: any) =>
          updatePostInCache(old, postId)
        );
      }

      // Notify parent to re-render
      onLikeChange?.();

      return { previousCaches };
    },
    onError: (_error, _postId, context) => {
      // Rollback all caches on error
      if (context?.previousCaches) {
        for (const { queryKey, data } of context.previousCaches) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      // Notify parent to re-render after rollback
      onLikeChange?.();
    },
    // No onSettled - optimistic updates are enough, server syncs on next manual refresh
  });

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    likeMutation.mutate(post.id);
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>{post.author.username}</Text>
        <Text style={styles.timestamp}>{formatRelativeTime(post.createdAt)}</Text>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <SimpleLineIcons
            name={post.isLikedByMe ? 'like' : 'like'}
            size={18}
            color={post.isLikedByMe ? Colors.light.red : '#7c7c7c'}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>

        {onComment && (
          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <FontAwesome
              name='comments-o'
              size={18}
              color={Colors.light.text}
            />
            <Text style={styles.actionText}>{post.commentCount}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.cardBackground,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: FontSizes.xs,
    color: '#7c7c7c',
  },
  content: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: '#7c7c7c',
  },
});
