import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface OnboardingProps {
  mentorName: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: 'upload' as const,
    title: 'Faça Upload do Seu Conteúdo',
    description: 'Envie seus materiais em PDF (artigos, aulas, protocolos). Nossa IA vai analisar e criar uma base de conhecimento exclusiva para você.',
    action: 'Ir para Upload',
    route: '/(mentor)/upload',
  },
  {
    icon: 'robot' as const,
    title: 'Revise o Perfil do Bot',
    description: 'Após o upload, a IA gera automaticamente um perfil de personalidade para seu bot. Revise e aprove antes de ativar.',
    action: 'Ver Meu Perfil',
    route: '/(mentor)/profile',
  },
  {
    icon: 'message-text-outline' as const,
    title: 'Pronto! Seus Pacientes Podem Consultar',
    description: 'Com o bot ativo, seus pacientes já podem fazer perguntas baseadas no seu conteúdo. Acompanhe tudo pelo Impactômetro.',
    action: 'Ver Dashboard',
    route: '/(mentor)/dashboard',
  },
];

export default function MentorOnboarding({ mentorName, onDismiss }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeEmoji}>👋</Text>
        <Text variant="headlineSmall" style={styles.welcomeTitle}>
          Bem-vindo, {mentorName}!
        </Text>
        <Text variant="bodyMedium" style={styles.welcomeSubtitle}>
          Vamos configurar seu assistente de IA em 3 passos simples
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>Passo {currentStep + 1} de {STEPS.length}</Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} color="#2563eb" style={styles.progressBar} />
      </View>

      {/* Step Card */}
      <Card style={styles.stepCard}>
        <Card.Content style={styles.stepContent}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={step.icon} size={40} color="#2563eb" />
          </View>
          
          <Text variant="titleLarge" style={styles.stepTitle}>
            {step.title}
          </Text>
          
          <Text variant="bodyMedium" style={styles.stepDescription}>
            {step.description}
          </Text>

          <Button
            mode="contained"
            onPress={handleAction}
            style={styles.actionButton}
            icon={step.icon}
          >
            {step.action}
          </Button>
        </Card.Content>
      </Card>

      {/* Step indicators */}
      <View style={styles.dotsContainer}>
        {STEPS.map((_, index) => (
          <Pressable key={index} onPress={() => setCurrentStep(index)}>
            <View
              style={[
                styles.dot,
                currentStep === index && styles.dotActive,
                index < currentStep && styles.dotCompleted,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <Button mode="text" onPress={handleBack} textColor="#64748b">
            Voltar
          </Button>
        ) : (
          <View />
        )}
        
        <Button
          mode="contained-tonal"
          onPress={handleNext}
          style={styles.nextButton}
        >
          {currentStep < STEPS.length - 1 ? 'Próximo' : 'Concluir'}
        </Button>
      </View>

      {/* Skip */}
      <Pressable onPress={onDismiss} style={styles.skipButton}>
        <Text style={styles.skipText}>Pular onboarding</Text>
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
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
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
  progressText: {
    color: '#64748b',
    fontSize: 13,
  },
  progressPercent: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  stepCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
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
    backgroundColor: '#e2e8f0',
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
  dotCompleted: {
    backgroundColor: '#93c5fd',
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
  skipText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
