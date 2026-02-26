import prisma from '../../config/prisma';
import { getFirebaseApp } from '../../config/firebase';
import admin from 'firebase-admin';

interface RegisterTokenInput {
  token: string;
  userId: string;
}

interface SendPushInput {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const registerToken = async ({ token, userId }: RegisterTokenInput) => {
  // Check if token already exists for this user
  const existingToken = await prisma.fcmToken.findFirst({
    where: {
      token,
      userId,
    },
  });

  if (existingToken) {
    // Update timestamp
    return await prisma.fcmToken.update({
      where: { id: existingToken.id },
      data: { updatedAt: new Date() },
    });
  }

  // Create new token
  return await prisma.fcmToken.create({
    data: {
      token,
      userId,
    },
  });
};

export const sendPushToUser = async ({
  userId,
  title,
  body,
  data = {},
}: SendPushInput): Promise<boolean> => {
  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    console.warn('Firebase not initialized. Skipping push notification.');
    return false;
  }

  // Get all FCM tokens for the user
  const fcmTokens = await prisma.fcmToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (fcmTokens.length === 0) {
    console.log(`No FCM tokens found for user ${userId}`);
    return false;
  }

  const tokens = fcmTokens.map((t) => t.token);

  // Create the message
  const message: admin.messaging.MulticastMessage = {
    notification: {
      title,
      body,
    },
    data,
    tokens,
    android: {
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    // Send multicast message
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `Push notification sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: {
            token: { in: invalidTokens },
          },
        });
        console.log(`🗑️  Cleaned up ${invalidTokens.length} invalid FCM tokens`);
      }
    }

    return response.successCount > 0;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

export const sendLikeNotification = async (
  postAuthorId: string,
  actorUsername: string,
  postId: string
) => {
  return sendPushToUser({
    userId: postAuthorId,
    title: 'New Like',
    body: `${actorUsername} liked your post`,
    data: {
      type: 'like',
      postId,
      actorUsername,
    },
  });
};

export const sendCommentNotification = async (
  postAuthorId: string,
  actorUsername: string,
  commentPreview: string,
  postId: string
) => {
  const truncatedPreview =
    commentPreview.length > 50
      ? commentPreview.substring(0, 50) + '...'
      : commentPreview;

  return sendPushToUser({
    userId: postAuthorId,
    title: 'New Comment',
    body: `${actorUsername} commented: "${truncatedPreview}"`,
    data: {
      type: 'comment',
      postId,
      actorUsername,
    },
  });
};
