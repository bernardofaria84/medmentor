import { Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function MentorLayout() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.user_type !== 'mentor') {
      router.replace('/(mentor)/login');
    }
  }, [isAuthenticated, user]);

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
    </Stack>
  );
}
