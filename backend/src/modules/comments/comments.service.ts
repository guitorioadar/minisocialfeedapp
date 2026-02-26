import prisma from '../../config/prisma';
import { sendCommentNotification } from '../notifications/notifications.service';

interface CreateCommentInput {
  postId: string;
  userId: string;
  content: string;
}

interface GetCommentsInput {
  postId: string;
  page: number;
  limit: number;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
  };
}

const transformComment = (comment: any): CommentItem => ({
  id: comment.id,
  content: comment.content,
  createdAt: comment.createdAt,
  author: comment.user,
});

export const createComment = async ({
  postId,
  userId,
  content,
}: CreateCommentInput): Promise<CommentItem> => {
  // Check if post exists and get author info
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  // Get current user's username
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      userId,
      postId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  // Send notification to post author (if not self-comment)
  if (post.authorId !== userId) {
    sendCommentNotification(post.authorId, user.username, content, postId).catch(
      (error) => {
        console.error('Failed to send comment notification:', error);
      }
    );
  }

  return transformComment(comment);
};

export const getComments = async ({
  postId,
  page,
  limit,
}: GetCommentsInput) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  const skip = (page - 1) * limit;

  // Get total count
  const total = await prisma.comment.count({
    where: { postId },
  });

  // Get comments with pagination
  const comments = await prisma.comment.findMany({
    where: { postId },
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return {
    comments: comments.map(transformComment),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
