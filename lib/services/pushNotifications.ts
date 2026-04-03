import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      undefined;

    if (!projectId) {
      console.warn('[PUSH] Missing projectId. Set EXPO_PUBLIC_EAS_PROJECT_ID to enable Expo push token registration.');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    if (!token) return null;

    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,token',
        ignoreDuplicates: false,
      }
    );

    if (error) {
      throw error;
    }

    return token;
  } catch (error) {
    console.warn('[PUSH] registerForPushNotifications failed:', error);
    return null;
  }
}
