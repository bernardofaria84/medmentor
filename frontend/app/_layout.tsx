import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    error: '#ef4444',
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/signup" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(mentor)" />
            <Stack.Screen name="chat/[mentorId]" />
            <Stack.Screen name="conversation/[conversationId]" />
          </Stack>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
