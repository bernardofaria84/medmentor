import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && user) {
          if (user.user_type === 'mentor') {
            router.replace('/(mentor)/dashboard');
          } else {
            router.replace('/(tabs)/home');
          }
        } else {
          router.replace('/(auth)/login');
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]} data-testid="splash-screen">
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="stethoscope" size={64} color={colors.primary} />
        </View>
        <Text variant="displaySmall" style={styles.appName}>MedMentor</Text>
        <Text variant="bodyLarge" style={styles.tagline}>Mentoria Medica com IA</Text>
      </View>
      <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      <Text variant="bodySmall" style={styles.version}>v2.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  appName: {
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  loader: {
    marginTop: 32,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(255,255,255,0.6)',
  },
});
