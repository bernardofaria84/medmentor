import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MentorLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.replace('/(mentor)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="doctor" size={64} color="#2563eb" />
          <Text variant="displaySmall" style={styles.title}>
            MedMentor
          </Text>
          <Text variant="titleMedium" style={styles.subtitle}>
            Portal do Mentor
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              disabled={loading}
            />

            <TextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              disabled={loading}
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Entrar
            </Button>

            <Text variant="bodySmall" style={styles.testCredentials}>
              Teste: dr.cardiology@medmentor.com / password123
            </Text>
          </Card.Content>
        </Card>

        {Platform.OS === 'web' && (
          <Button
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            style={styles.switchButton}
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
    backgroundColor: '#f8fafc',
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
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 16,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  testCredentials: {
    textAlign: 'center',
    marginTop: 16,
    color: '#94a3b8',
  },
  switchButton: {
    marginTop: 16,
  },
});
