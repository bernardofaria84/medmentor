import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useAppTheme } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { paperTheme, colors } = useAppTheme();

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(mentor)" />
          <Stack.Screen name="chat/[mentorId]" />
          <Stack.Screen
            name="conversation/[conversationId]"
            options={{
              headerShown: true,
              title: 'Conversa',
              headerStyle: { backgroundColor: colors.headerBg },
              headerTintColor: colors.headerText,
              headerTitleStyle: { fontFamily: 'Inter_700Bold' },
            }}
          />
        </Stack>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
