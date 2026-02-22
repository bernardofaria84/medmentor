import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import PasswordStrength from '../../components/PasswordStrength';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
  return null;
}

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [crm, setCrm] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { signup } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const emailError = touched.email && email && !validateEmail(email) ? 'Email invalido' : '';
  const passwordError = touched.password ? validatePassword(password) : '';
  const confirmError = touched.confirmPassword && password !== confirmPassword ? 'As senhas nao coincidem' : '';
  const nameError = touched.fullName && !fullName.trim() ? 'Nome e obrigatorio' : '';
  const crmError = touched.crm && !crm.trim() ? 'CRM e obrigatorio' : '';

  const handleSignup = async () => {
    setTouched({ email: true, password: true, confirmPassword: true, fullName: true, crm: true });

    if (!email || !password || !fullName || !crm) {
      setError('Por favor, preencha todos os campos obrigatorios');
      return;
    }
    if (!validateEmail(email)) {
      setError('Email invalido');
      return;
    }
    if (validatePassword(password)) {
      setError(validatePassword(password)!);
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup(email, password, fullName, crm, specialty);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
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
            <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
              Criar Conta
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.textSecondary }]}>
              Cadastre-se como Medico Assinante
            </Text>

            <Surface style={[styles.card, { backgroundColor: colors.card }]} elevation={1}>
              <TextInput
                label="Nome Completo *"
                value={fullName}
                onChangeText={setFullName}
                onBlur={() => markTouched('fullName')}
                mode="outlined"
                style={styles.input}
                disabled={loading}
                error={!!nameError}
                data-testid="signup-name-input"
              />
              {!!nameError && <HelperText type="error">{nameError}</HelperText>}

              <TextInput
                label="Email *"
                value={email}
                onChangeText={setEmail}
                onBlur={() => markTouched('email')}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                disabled={loading}
                error={!!emailError}
                data-testid="signup-email-input"
              />
              {!!emailError && <HelperText type="error">{emailError}</HelperText>}

              <TextInput
                label="Senha *"
                value={password}
                onChangeText={setPassword}
                onBlur={() => markTouched('password')}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                disabled={loading}
                error={!!passwordError}
                data-testid="signup-password-input"
              />
              <PasswordStrength password={password} />
              {!!passwordError && <HelperText type="error">{passwordError}</HelperText>}

              <TextInput
                label="Confirmar Senha *"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => markTouched('confirmPassword')}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                disabled={loading}
                error={!!confirmError}
                data-testid="signup-confirm-password-input"
              />
              {!!confirmError && <HelperText type="error">{confirmError}</HelperText>}

              <TextInput
                label="CRM *"
                value={crm}
                onChangeText={setCrm}
                onBlur={() => markTouched('crm')}
                mode="outlined"
                style={styles.input}
                disabled={loading}
                error={!!crmError}
                data-testid="signup-crm-input"
              />
              {!!crmError && <HelperText type="error">{crmError}</HelperText>}

              <TextInput
                label="Especialidade (Opcional)"
                value={specialty}
                onChangeText={setSpecialty}
                mode="outlined"
                style={styles.input}
                disabled={loading}
                data-testid="signup-specialty-input"
              />

              {error ? (
                <Text style={styles.errorText} data-testid="signup-error">{error}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                style={styles.button}
                data-testid="signup-submit-btn"
              >
                Cadastrar
              </Button>

              <Button
                mode="text"
                onPress={() => router.back()}
                disabled={loading}
                style={styles.linkButton}
              >
                Ja tem conta? Faca login
              </Button>
            </Surface>
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
    marginBottom: 12,
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
});
