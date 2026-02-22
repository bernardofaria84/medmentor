import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      if (result.user_type === 'mentor') {
        router.replace('/(mentor)/dashboard');
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
            <Text variant="displaySmall" style={[styles.title, { color: colors.primary }]}>
              MedMentor
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.textSecondary }]}>
              Mentoria Medica com IA
            </Text>

            <Surface style={[styles.card, { backgroundColor: colors.card }]} elevation={1}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                disabled={loading}
                data-testid="login-email-input"
              />

              <TextInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                disabled={loading}
                data-testid="login-password-input"
              />

              {error ? (
                <Text style={styles.errorText} data-testid="login-error">{error}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                data-testid="login-submit-btn"
              >
                Entrar
              </Button>

              <Button
                mode="text"
                onPress={() => router.push('/(auth)/signup')}
                disabled={loading}
                style={styles.linkButton}
              >
                Nao tem conta? Cadastre-se
              </Button>

              <Button
                mode="text"
                onPress={() => router.push('/(mentor)/login')}
                disabled={loading}
                style={styles.linkButton}
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
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
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
  },
  linkButton: {
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  testCredentials: {
    textAlign: 'center',
    marginTop: 24,
  },
});
