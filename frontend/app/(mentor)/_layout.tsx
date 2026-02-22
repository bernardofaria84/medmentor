import { Stack, useSegments } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function MentorLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || loading) return;

    const isOnLogin = segments.includes('login');
    if (isOnLogin) return;

    if (!isAuthenticated || user?.user_type !== 'mentor') {
      router.replace('/(mentor)/login');
    }
  }, [isAuthenticated, user, loading, isReady, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="content" options={{ title: 'Meu Conteudo' }} />
      <Stack.Screen name="upload" options={{ title: 'Upload de Conteudo' }} />
      <Stack.Screen name="profile" options={{ title: 'Meu Perfil' }} />
      <Stack.Screen name="analytics-queries" options={{ title: 'Analise de Consultas' }} />
      <Stack.Screen name="analytics-ratings" options={{ title: 'Analise de Avaliacoes' }} />
      <Stack.Screen name="analytics-content" options={{ title: 'Analise de Conteudo' }} />
    </Stack>
  );
}
