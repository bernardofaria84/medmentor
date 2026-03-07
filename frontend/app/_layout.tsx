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
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)/signup" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(mentor)" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="chat/[mentorId]"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 320,
            }}
          />
          <Stack.Screen
            name="conversation/[conversationId]"
            options={{
              headerShown: true,
              title: 'Conversa',
              headerStyle: { backgroundColor: colors.headerBg },
              headerTintColor: colors.headerText,
              headerTitleStyle: { fontFamily: 'Inter_700Bold' },
              animation: 'slide_from_right',
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
