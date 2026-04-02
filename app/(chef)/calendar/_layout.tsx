import { Stack } from 'expo-router';
import React from 'react';

export default function CalendarLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', presentation: 'card' }} />;
}
