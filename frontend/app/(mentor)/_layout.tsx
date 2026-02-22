import { Stack, useSegments } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function MentorLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait until after first render to navigate
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || loading) return;

    // Allow access to login screen always
    const isOnLogin = segments.includes('login');
    if (isOnLogin) return;

    // Redirect to login if not authenticated as mentor
    if (!isAuthenticated || user?.user_type !== 'mentor') {
      router.replace('/(mentor)/login');
    }
  }, [isAuthenticated, user, loading, isReady, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="content" options={{ title: 'Meu Conteúdo' }} />
      <Stack.Screen name="upload" options={{ title: 'Upload de Conteúdo' }} />
      <Stack.Screen name="profile" options={{ title: 'Meu Perfil' }} />
      <Stack.Screen name="analytics-queries" options={{ title: 'Análise de Consultas' }} />
      <Stack.Screen name="analytics-ratings" options={{ title: 'Análise de Avaliações' }} />
      <Stack.Screen name="analytics-content" options={{ title: 'Análise de Conteúdo' }} />
    </Stack>
  );
}
