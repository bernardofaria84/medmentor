import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { useAppTheme } from '../contexts/ThemeContext';

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '#e2e8f0' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 0.2, label: 'Muito fraca', color: '#ef4444' };
  if (score === 2) return { level: 0.4, label: 'Fraca', color: '#f97316' };
  if (score === 3) return { level: 0.6, label: 'Razoável', color: '#f59e0b' };
  if (score === 4) return { level: 0.8, label: 'Forte', color: '#22c55e' };
  return { level: 1, label: 'Muito forte', color: '#16a34a' };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { colors } = useAppTheme();
  const { level, label, color } = getStrength(password);

  if (!password) return null;

  return (
    <View style={styles.container} data-testid="password-strength">
      <ProgressBar
        progress={level}
        color={color}
        style={[styles.bar, { backgroundColor: colors.border }]}
      />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -8,
    marginBottom: 12,
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
