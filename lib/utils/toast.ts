import { Alert, Platform, ToastAndroid } from 'react-native';
import Toast from 'react-native-toast-message';

export function showSuccess(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Toast.show({ type: 'success', text1: message });
}

export function showError(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Toast.show({ type: 'error', text1: message });
}

export function showBlockingError(message: string) {
  Alert.alert('Error', message);
}
