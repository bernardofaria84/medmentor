import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Card, Divider, List, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="stethoscope" size={48} color="#2563eb" />
          </View>
          <Text variant="headlineMedium" style={styles.appName}>MedMentor</Text>
          <Text variant="bodyMedium" style={styles.tagline}>Mentoria Médica com IA</Text>
          <Text variant="bodySmall" style={styles.version}>Versão 2.0.0</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Sobre o App</Text>
            <Text variant="bodyMedium" style={styles.bodyText}>
              O MedMentor é uma plataforma de mentoria médica potencializada por Inteligência Artificial. 
              Conectamos médicos especialistas com profissionais de saúde através de bots inteligentes que 
              aprendem com o conteúdo exclusivo de cada mentor.
            </Text>
            <Text variant="bodyMedium" style={[styles.bodyText, { marginTop: 12 }]}>
              Cada resposta é baseada em fontes verificadas e aprovadas pelo mentor, garantindo 
              informações confiáveis e relevantes para a prática clínica.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Funcionalidades</Text>
            <List.Item
              title="Consultas com IA"
              description="Pergunte sobre temas médicos e receba respostas baseadas em evidências"
              left={props => <List.Icon {...props} icon="message-text" color="#2563eb" />}
            />
            <Divider />
            <List.Item
              title="Resumo SOAP"
              description="Gere resumos clínicos estruturados das consultas"
              left={props => <List.Icon {...props} icon="clipboard-text" color="#2563eb" />}
            />
            <Divider />
            <List.Item
              title="Transcrição por Voz"
              description="Faça perguntas por voz com transcrição automática"
              left={props => <List.Icon {...props} icon="microphone" color="#2563eb" />}
            />
            <Divider />
            <List.Item
              title="Pesquisa Universal"
              description="Busque em todas as bases de conhecimento simultaneamente"
              left={props => <List.Icon {...props} icon="magnify" color="#2563eb" />}
            />
            <Divider />
            <List.Item
              title="Dashboard Impactômetro"
              description="Métricas em tempo real para mentores"
              left={props => <List.Icon {...props} icon="chart-bar" color="#2563eb" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Termos de Uso</Text>
            <Text variant="bodyMedium" style={styles.bodyText}>
              Ao utilizar o MedMentor, você concorda com os seguintes termos:
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              1. As respostas fornecidas pelo sistema são baseadas em conteúdo educacional e não substituem 
              uma consulta médica profissional presencial.
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              2. O conteúdo é de responsabilidade dos mentores que o disponibilizam na plataforma.
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              3. Seus dados pessoais são protegidos de acordo com a LGPD (Lei Geral de Proteção de Dados).
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              4. O uso do aplicativo é pessoal e intransferível. Não compartilhe suas credenciais de acesso.
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              5. Informações sensíveis de pacientes não devem ser inseridas nas consultas. 
              O sistema possui anonimização automática, mas a responsabilidade primária é do usuário.
            </Text>
            <Text variant="bodySmall" style={styles.termItem}>
              6. O MedMentor reserva-se o direito de suspender contas que violem estes termos.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Política de Privacidade</Text>
            <Text variant="bodyMedium" style={styles.bodyText}>
              Coletamos apenas os dados necessários para o funcionamento do serviço: email, nome e histórico de conversas.
              Seus dados não são compartilhados com terceiros e são armazenados de forma segura e criptografada.
            </Text>
            <Text variant="bodyMedium" style={[styles.bodyText, { marginTop: 8 }]}>
              Você pode solicitar a exclusão completa dos seus dados a qualquer momento através do suporte.
            </Text>
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={styles.footer}>
          © 2025 MedMentor. Todos os direitos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  tagline: {
    color: '#64748b',
    marginTop: 4,
  },
  version: {
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  bodyText: {
    color: '#374151',
    lineHeight: 22,
  },
  termItem: {
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 4,
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 32,
  },
});
