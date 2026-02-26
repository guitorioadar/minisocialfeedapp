import prisma from '../../config/prisma';

interface CreatePostInput {
  content: string;
  authorId: string;
}

interface GetPostsInput {
  page: number;
  limit: number;
  username?: string;
  currentUserId?: string;
}

interface PostItem {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
  };
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
}

export const createPost = async ({
  content,
  authorId,
}: CreatePostInput) => {
  const post = await prisma.post.create({
    data: {
      content,
      authorId,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return post;
};

export const getPosts = async ({
  page,
  limit,
  username,
  currentUserId,
}: GetPostsInput) => {
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (username) {
    where.author = {
      username: {
        contains: username,
        mode: 'insensitive',
      },
    };
  }

  // Get total count
  const total = await prisma.post.count({ where });

  // Get posts with pagination
  const posts = await prisma.post.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      likes: currentUserId
        ? {
            where: {
              userId: currentUserId,
            },
            select: {
              id: true,
            },
          }
        : undefined,
    },
  });

  // Transform posts to include isLikedByMe
  const transformedPosts: PostItem[] = posts.map((post) => ({
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    author: post.author,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isLikedByMe: currentUserId ? post.likes.length > 0 : false,
  }));

  return {
    posts: transformedPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
