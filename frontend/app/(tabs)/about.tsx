import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Stack } from 'expo-router';

export default function AboutScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sobre',
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="stethoscope" size={48} color={colors.primary} />
          </View>
          <Text variant="headlineMedium" style={[styles.appName, { color: colors.primary }]}>MedMentor</Text>
          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>Mentoria Medica com IA</Text>
          <Text variant="bodySmall" style={{ color: colors.textTertiary, marginTop: 4 }}>Versao 2.0.0</Text>
        </View>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Sobre o App</Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, lineHeight: 22 }}>
              O MedMentor e uma plataforma de mentoria medica potencializada por Inteligencia Artificial.
              Conectamos medicos especialistas com profissionais de saude atraves de bots inteligentes que
              aprendem com o conteudo exclusivo de cada mentor.
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 12 }}>
              Cada resposta e baseada em fontes verificadas e aprovadas pelo mentor, garantindo
              informacoes confiaveis e relevantes para a pratica clinica.
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Funcionalidades</Text>
            <List.Item
              title="Consultas com IA"
              description="Pergunte sobre temas medicos e receba respostas baseadas em evidencias"
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="message-text" color={colors.primary} />}
            />
            <Divider style={{ backgroundColor: colors.border }} />
            <List.Item
              title="Resumo SOAP"
              description="Gere resumos clinicos estruturados das consultas"
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="clipboard-text" color={colors.primary} />}
            />
            <Divider style={{ backgroundColor: colors.border }} />
            <List.Item
              title="Transcricao por Voz"
              description="Faca perguntas por voz com transcricao automatica"
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="microphone" color={colors.primary} />}
            />
            <Divider style={{ backgroundColor: colors.border }} />
            <List.Item
              title="Pesquisa Universal"
              description="Busque em todas as bases de conhecimento simultaneamente"
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="magnify" color={colors.primary} />}
            />
            <Divider style={{ backgroundColor: colors.border }} />
            <List.Item
              title="Dashboard Impactometro"
              description="Metricas em tempo real para mentores"
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="chart-bar" color={colors.primary} />}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.card }]} data-testid="terms-card">
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Termos de Uso</Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, lineHeight: 22 }}>
              Ao utilizar o MedMentor, voce concorda com os seguintes termos:
            </Text>
            {[
              '1. As respostas fornecidas pelo sistema sao baseadas em conteudo educacional e nao substituem uma consulta medica profissional presencial.',
              '2. O conteudo e de responsabilidade dos mentores que o disponibilizam na plataforma.',
              '3. Seus dados pessoais sao protegidos de acordo com a LGPD (Lei Geral de Protecao de Dados).',
              '4. O uso do aplicativo e pessoal e intransferivel. Nao compartilhe suas credenciais de acesso.',
              '5. Informacoes sensiveis de pacientes nao devem ser inseridas nas consultas. O sistema possui anonimizacao automatica, mas a responsabilidade primaria e do usuario.',
              '6. O MedMentor reserva-se o direito de suspender contas que violem estes termos.',
            ].map((term, idx) => (
              <Text key={idx} variant="bodySmall" style={[styles.termItem, { color: colors.textSecondary }]}>
                {term}
              </Text>
            ))}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Politica de Privacidade</Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, lineHeight: 22 }}>
              Coletamos apenas os dados necessarios para o funcionamento do servico: email, nome e historico de conversas.
              Seus dados nao sao compartilhados com terceiros e sao armazenados de forma segura e criptografada.
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 8 }}>
              Voce pode solicitar a exclusao completa dos seus dados a qualquer momento atraves do suporte.
            </Text>
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={[styles.footer, { color: colors.textTertiary }]}>
          2025 MedMentor. Todos os direitos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  termItem: {
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 4,
  },
  footer: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});
