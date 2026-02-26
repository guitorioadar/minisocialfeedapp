import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { notificationsService } from '../services/notifications.service';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

// Configure how notifications are displayed when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Check if Firebase Messaging is available
 */
export const isFirebaseAvailable = (): boolean => {
  try {
    return !!messaging;
  } catch {
    console.log('📱 Firebase Messaging not available');
    return false;
  }
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();

    if (status === 'granted') {
      console.log('Notification permission granted');
      return true;
    }

    console.warn('Notification permission denied');
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token and register it with backend
 */
export const registerFCMToken = async (): Promise<string | null> => {
  if (!isFirebaseAvailable()) {
    console.log('Firebase not available');
    return null;
  }

  try {
    // Check permission first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return null;
    }

    // Get FCM token
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      console.warn('No FCM token received');
      return null;
    }

    console.log('FCM Token obtained:', fcmToken.substring(0, 20) + '...');

    // Register with backend
    await notificationsService.registerToken(fcmToken);
    console.log('FCM token registered with backend');

    return fcmToken;
  } catch (error: any) {
    console.error('Error registering FCM token:', error.message);
    return null;
  }
};

/**
 * Listen for token refresh events
 */
export const setupTokenRefreshListener = (): (() => void) => {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  const unsubscribe = messaging().onTokenRefresh(async (fcmToken: string) => {
    console.log('🔄 FCM token refreshed');
    try {
      await notificationsService.registerToken(fcmToken);
      console.log('Refreshed token registered');
    } catch (error) {
      console.error('Error registering refreshed token:', error);
    }
  });

  return unsubscribe;
};

/**
 * Setup notification listeners (foreground/background)
 */
export const setupNotificationListeners = (): (() => void) => {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  // Foreground message handler
  const unsubscribeForeground = messaging().onMessage(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('📬 Notification received in foreground');

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'New Notification',
            body: remoteMessage.notification?.body || '',
            data: (remoteMessage.data as Record<string, any>) || {},
          },
          trigger: null,
        });
      } catch (error) {
        console.error('Error displaying notification:', error);
      }
    }
  );

  // Handle notification tap when app is in background
  const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(
    (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('📬 Notification opened from background');
      handleNotificationNavigation(remoteMessage);
    }
  );

  // Handle notification tap when app is completely quit
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📬 Notification opened from quit state');
        handleNotificationNavigation(remoteMessage);
      }
    });

  // Handle notification tap when displayed by expo-notifications (foreground)
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('📬 Notification tapped (expo-notifications)');
      const data = response.notification.request.content.data;
      handleExpoNotificationNavigation(data);
    }
  );

  return () => {
    unsubscribeForeground();
    unsubscribeNotificationOpened();
    subscription.remove();
  };
};

/**
 * Handle navigation when notification is tapped (Firebase)
 */
const handleNotificationNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): void => {
  try {
    const { data } = remoteMessage;
    if (!data) return;

    if ((data.type === 'like' || data.type === 'comment') && data.postId) {
      console.log('Navigating to post:', data.postId);
      router.push(`/post/${data.postId}`);
    }
  } catch (error) {
    console.error('Error handling notification navigation:', error);
  }
};

/**
 * Handle navigation when expo-notifications notification is tapped (foreground)
 */
const handleExpoNotificationNavigation = (data: any): void => {
  try {
    if (!data) return;

    if ((data.type === 'like' || data.type === 'comment') && data.postId) {
      console.log('Navigating to post from expo notification:', data.postId);
      router.push(`/post/${data.postId}`);
    }
  } catch (error) {
    console.error('Error handling expo notification navigation:', error);
  }
};

/**
 * Initialize notifications - call this on app startup
 */
export const initializeNotifications = async (): Promise<void> => {
  console.log('🔔 Initializing notifications...');

  if (!isFirebaseAvailable()) {
    console.log('Firebase not available - notifications disabled');
    return;
  }

  try {
    await requestNotificationPermission();
    setupTokenRefreshListener();
    setupNotificationListeners();
    console.log('Notifications initialized');
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
};
