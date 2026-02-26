import prisma from '../../config/prisma';
import { sendLikeNotification } from '../notifications/notifications.service';

interface ToggleLikeInput {
  postId: string;
  userId: string;
}

interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

export const toggleLike = async ({
  postId,
  userId,
}: ToggleLikeInput): Promise<ToggleLikeResult> => {
  // Check if post exists and get author info
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, author: { select: { username: true } } },
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

  // Check if user already liked the post
  const existingLike = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (existingLike) {
    // Unlike: delete the like
    await prisma.like.delete({
      where: {
        id: existingLike.id,
      },
    });

    const likeCount = await prisma.like.count({
      where: { postId },
    });

    return {
      liked: false,
      likeCount,
    };
  } else {
    await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    // Send notification to post author (if not self-like)
    if (post.authorId !== userId) {
      sendLikeNotification(post.authorId, user.username, postId).catch(
        (error) => {
          console.error('Failed to send like notification:', error);
        }
      );
    }

    const likeCount = await prisma.like.count({
      where: { postId },
    });

    return {
      liked: true,
      likeCount,
    };
  }
};

export const checkUserLike = async (
  postId: string,
  userId: string
): Promise<boolean> => {
  const like = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  return !!like;
};
