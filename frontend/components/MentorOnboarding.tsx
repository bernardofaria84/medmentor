import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../contexts/ThemeContext';

interface OnboardingProps {
  mentorName: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: 'upload' as const,
    title: 'Faca Upload do Seu Conteudo',
    description: 'Envie seus materiais em PDF (artigos, aulas, protocolos). Nossa IA vai analisar e criar uma base de conhecimento exclusiva para voce.',
    action: 'Ir para Upload',
    route: '/(mentor)/upload',
  },
  {
    icon: 'robot' as const,
    title: 'Revise o Perfil do Bot',
    description: 'Apos o upload, a IA gera automaticamente um perfil de personalidade para seu bot. Revise e aprove antes de ativar.',
    action: 'Ver Meu Perfil',
    route: '/(mentor)/profile',
  },
  {
    icon: 'message-text-outline' as const,
    title: 'Pronto! Seus Pacientes Podem Consultar',
    description: 'Com o bot ativo, seus pacientes ja podem fazer perguntas baseadas no seu conteudo. Acompanhe tudo pelo Impactometro.',
    action: 'Ver Dashboard',
    route: '/(mentor)/dashboard',
  },
];

export default function MentorOnboarding({ mentorName, onDismiss }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { colors } = useAppTheme();

  const step = STEPS[currentStep];
  const progress = (currentStep + 1) / STEPS.length;

  const handleAction = () => {
    router.push(step.route as any);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onDismiss();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="hand-wave" size={48} color={colors.primary} />
        <Text variant="headlineSmall" style={[styles.welcomeTitle, { color: colors.text }]}>
          Bem-vindo, {mentorName}!
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
          Vamos configurar seu assistente de IA em 3 passos simples
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Passo {currentStep + 1} de {STEPS.length}</Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} color={colors.primary} style={[styles.progressBar, { backgroundColor: colors.border }]} />
      </View>

      <Card style={[styles.stepCard, { backgroundColor: colors.card }]} data-testid="onboarding-step-card">
        <Card.Content style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name={step.icon} size={40} color={colors.primary} />
          </View>

          <Text variant="titleLarge" style={[styles.stepTitle, { color: colors.text }]}>
            {step.title}
          </Text>

          <Text variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            {step.description}
          </Text>

          <Button
            mode="contained"
            onPress={handleAction}
            icon={step.icon}
            data-testid="onboarding-action-btn"
          >
            {step.action}
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.dotsContainer}>
        {STEPS.map((_, index) => (
          <Pressable key={index} onPress={() => setCurrentStep(index)}>
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.border },
                currentStep === index && [styles.dotActive, { backgroundColor: colors.primary }],
                index < currentStep && { backgroundColor: colors.primary + '80' },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <Button mode="text" onPress={handleBack} textColor={colors.textSecondary}>
            Voltar
          </Button>
        ) : (
          <View />
        )}
        <Button mode="contained-tonal" onPress={handleNext} style={styles.nextButton}>
          {currentStep < STEPS.length - 1 ? 'Proximo' : 'Concluir'}
        </Button>
      </View>

      <Pressable onPress={onDismiss} style={styles.skipButton}>
        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Pular onboarding</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
  },
  progressSection: {
    width: '100%',
    marginBottom: 24,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  stepCard: {
    width: '100%',
    borderRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 24,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  nextButton: {
    minWidth: 120,
  },
  skipButton: {
    paddingVertical: 8,
  },
});
