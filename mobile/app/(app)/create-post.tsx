import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postsService } from '../../services/posts.service';
import { Colors, Spacing, FontSizes } from '../../constants/theme';

const MAX_CONTENT_LENGTH = 500;

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: postsService.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setContent('');
      router.replace('/(app)/feed');
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return;
    }

    createPostMutation.mutate({ content: content.trim() });
  };

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const progress = (content.length / MAX_CONTENT_LENGTH) * 100;

  const getProgressColor = () => {
    if (remainingChars < 20) return '#FF3B30';
    if (remainingChars < 50) return '#FF9500';
    return Colors.light.tint;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={28} color={Colors.light.tint} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.username}>You</Text>
              <Text style={styles.postingAs}>Posting publicly</Text>
            </View>
          </View>

          {/* Text Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="What's on your mind?"
              placeholderTextColor="#7c7c7c"
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              maxLength={MAX_CONTENT_LENGTH}
            />

          {/* Character Counter with Progress */}
          <View style={styles.counterContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%`, backgroundColor: getProgressColor() },
                ]}
              />
            </View>
            <Text style={[styles.charCount, { color: getProgressColor() }]}>
              {remainingChars}
            </Text>
          </View>
          </View>
        </ScrollView>

        {/* Bottom Post Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.postButton,
              (!content.trim() || createPostMutation.isPending) && styles.postButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || createPostMutation.isPending}
            activeOpacity={0.8}
          >
            {createPostMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#ffffff" style={styles.sendIcon} />
                <Text style={styles.postButtonText}>Post</Text>
              </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${Colors.light.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  postingAs: {
    fontSize: FontSizes.sm,
    color: '#7c7c7c',
  },
  inputContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.lg,
  },
  textArea: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  charCount: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.light.tint,
  },
  bottomContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingVertical: Spacing.md,
    borderRadius: 14,
    gap: Spacing.sm,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
});
