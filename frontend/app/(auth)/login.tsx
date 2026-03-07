import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_KEY } from '../onboarding';
import { BrandLogo } from '../../components/BrandLogo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      // Check if onboarding has been seen
      const onboardingSeen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!onboardingSeen) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <BrandLogo size={120} variant="full" />
            </View>
            <Text variant="displaySmall" style={[styles.title, { color: colors.primary }]}>
              MedMentor
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.textSecondary }]}>
              O conhecimento do especialista, na palma da sua mão.
            </Text>

            <Surface style={[styles.card, { backgroundColor: colors.card }]} elevation={2}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.inputBg }]}
                disabled={loading}
                data-testid="login-email-input"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.inputBg }]}
                disabled={loading}
                data-testid="login-password-input"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]} data-testid="login-error">{error}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={[styles.button, { backgroundColor: colors.primary }]}
                labelStyle={{ fontWeight: 'bold' }}
                data-testid="login-submit-btn"
              >
                Entrar
              </Button>

              <Button
                mode="text"
                onPress={() => router.push('/(auth)/signup')}
                disabled={loading}
                style={styles.linkButton}
                textColor={colors.primary}
              >
                Não tem conta? Cadastre-se
              </Button>

              <Button
                mode="text"
                onPress={() => router.push('/(mentor)/login')}
                disabled={loading}
                style={styles.linkButton}
                textColor={colors.textSecondary}
              >
                Sou Mentor - Entrar no Portal
              </Button>
            </Surface>

            <Text variant="bodySmall" style={[styles.testCredentials, { color: colors.textTertiary }]}>
              Teste: doctor@example.com / password123
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 20,
  },
  card: {
    padding: 24,
    borderRadius: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkButton: {
    marginTop: 8,
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  testCredentials: {
    textAlign: 'center',
    marginTop: 24,
  },
});
