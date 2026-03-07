import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { BrandLogo } from '../../components/BrandLogo';

export default function MentorLoginScreen() {
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
      await login(email, password, 'mentor');
      router.replace('/(mentor)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <BrandLogo size={120} variant="full" />
          <Text variant="displaySmall" style={[styles.title, { color: colors.primary }]}>
            MedMentor
          </Text>
          <Text variant="titleMedium" style={[styles.subtitle, { color: colors.textSecondary }]}>
            Portal do Mentor
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.inputBg }]}
              disabled={loading}
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
              onSubmitEditing={handleLogin}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Entrar
            </Button>

            <Text variant="bodySmall" style={[styles.testCredentials, { color: colors.textTertiary }]}>
              Teste: dr.cardiology@medmentor.com / password123
            </Text>
          </Card.Content>
        </Card>

        {Platform.OS === 'web' && (
          <Button
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            style={styles.switchButton}
            textColor={colors.primary}
          >
            Área do Médico Assinante
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    marginTop: 16,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  card: {
    padding: 16,
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
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  testCredentials: {
    textAlign: 'center',
    marginTop: 16,
  },
  switchButton: {
    marginTop: 16,
  },
});
