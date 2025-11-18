import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log('🔄 Index.tsx redirecting:', { isAuthenticated, user });
      
      if (isAuthenticated && user) {
        // Redireciona baseado no tipo de usuário
        if (user.user_type === 'mentor') {
          console.log('➡️ Redirecting to mentor dashboard');
          router.replace('/(mentor)/dashboard');
        } else {
          console.log('➡️ Redirecting to user home');
          router.replace('/(tabs)/home');
        }
      } else {
        console.log('➡️ Redirecting to login');
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, loading, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
