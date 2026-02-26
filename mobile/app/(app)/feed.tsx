import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { postsService } from '../../services/posts.service';
import { PostCard } from '../../components/PostCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { AlertDialog } from '../../components/AlertDialog';
import { Colors, Spacing, isTablet } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initializeNotifications, registerFCMToken } from '../../utils/notifications';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();

    // Also try to register FCM token on startup (for logged-in users)
    const registerOnStartup = async () => {
      if (user) {
        console.log('📱 User logged in, attempting FCM token registration...');
        const token = await registerFCMToken();
        if (token) {
          console.log('FCM token registered on startup');
        } else {
          console.log('ℹ️  FCM token not registered (Firebase unavailable or permission denied)');
        }
      }
    };

    // Small delay to ensure Firebase is ready
    const timeoutId = setTimeout(registerOnStartup, 1000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['posts', searchQuery],
    queryFn: ({ pageParam = 1 }) =>
      postsService.getPosts({ page: pageParam, limit: 20, username: searchQuery || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });

  const posts = data?.pages.flatMap((page) => page?.data || []) || [];

  const handleComment = useCallback((postId: string) => {
    router.push(`/post/${postId}`);
  }, []);

  const renderPost = useCallback(({ item }: any) => (
    <PostCard
      post={item}
      onComment={() => handleComment(item.id)}
      onPress={() => router.push(`/post/${item.id}`)}
    />
  ), [handleComment]);

  const listHeader = (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.userInfoContainer}>
        <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.light.tint} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => setSearchQuery(searchInput.trim())}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#7c7c7c" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setSearchQuery(searchInput.trim())}
          >
            <Ionicons name="search" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ListFooter = () => {
    if (!isFetchingNextPage) return null;
    return <LoadingSpinner />;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load posts'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        {listHeader}
        <EmptyState message={searchQuery ? 'No posts found' : 'No posts yet. Be the first!'} />
      </View>
    );
  }

  const numColumns = isTablet() ? 1 : 1;

  return (
    <View style={styles.container}>
      {listHeader}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListFooterComponent={ListFooter}
        numColumns={numColumns}
        key={numColumns.toString()}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      />
      <AlertDialog
        visible={showLogoutDialog}
        title="Logout"
        message="Are you sure you want to logout? You'll need to login again to access your account."
        icon="logout"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  searchContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerContainer: {
    backgroundColor: Colors.light.background,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  logoutText: {
    marginLeft: Spacing.xs,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    paddingLeft: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.light.border,
  },
  searchButton: {
    backgroundColor: Colors.light.tint,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
