import { api } from './api';

interface CreatePostData {
  content: string;
}

interface GetPostsParams {
  page?: number;
  limit?: number;
  username?: string;
}

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

interface PostsResponse {
  success: true;
  message: string;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PostsData {
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ToggleLikeResponse {
  success: true;
  message: string;
  data: {
    liked: boolean;
    likeCount: number;
  };
}

interface CreateCommentData {
  content: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
  };
}

interface CommentsResponse {
  success: true;
  message: string;
  data: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CommentsData {
  data: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const postsService = {
  async createPost(data: CreatePostData): Promise<Post> {
    const response = await api.post<{ success: true; data: Post }>('/posts', data);
    return response.data.data;
  },

  async getPosts(params: GetPostsParams = {}): Promise<PostsData> {
    const response = await api.get<PostsResponse>('/posts', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  async toggleLike(postId: string): Promise<ToggleLikeResponse['data']> {
    const response = await api.post<ToggleLikeResponse>(`/posts/${postId}/like`);
    return response.data.data;
  },

  async createComment(postId: string, data: CreateCommentData): Promise<Comment> {
    const response = await api.post<{ success: true; data: Comment }>(
      `/posts/${postId}/comment`,
      data
    );
    return response.data.data;
  },

  async getComments(postId: string, page = 1, limit = 20): Promise<CommentsData> {
    const response = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },
};
