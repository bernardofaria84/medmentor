import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider, Appbar, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  total_queries: number;
  average_rating: number;
  total_content: number;
  top_topics: string[];
}

export default function MentorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/mentor/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(mentor)/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.welcomeText}>
            Bem-vindo, Dr(a)!
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Aqui está um resumo da sua atividade
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="message-text" size={32} color="#2563eb" />
              <Text variant="headlineMedium" style={styles.statNumber}>
                {stats?.total_queries || 0}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Consultas Respondidas
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="star" size={32} color="#f59e0b" />
              <Text variant="headlineMedium" style={styles.statNumber}>
                {stats?.average_rating.toFixed(1) || '0.0'}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Avaliação Média
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="file-document" size={32} color="#10b981" />
              <Text variant="headlineMedium" style={styles.statNumber}>
                {stats?.total_content || 0}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Conteúdos Publicados
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.actionCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.actionTitle}>
              Ações Rápidas
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="upload"
                onPress={() => router.push('/(mentor)/upload')}
                style={styles.actionButton}
              >
                Upload de Conteúdo
              </Button>
              <Button
                mode="outlined"
                icon="folder"
                onPress={() => router.push('/(mentor)/content')}
                style={styles.actionButton}
              >
                Gerenciar Conteúdo
              </Button>
              <Button
                mode="outlined"
                icon="account"
                onPress={() => router.push('/(mentor)/profile')}
                style={styles.actionButton}
              >
                Editar Perfil
              </Button>
            </View>
          </Card.Content>
        </Card>

        {Platform.OS === 'web' && (
          <Button
            mode="text"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor="#ef4444"
          >
            Sair
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  statCard: {
    flex: Platform.OS === 'web' ? '1 1 300px' : 1,
    margin: 8,
    minWidth: Platform.OS === 'web' ? 250 : undefined,
    backgroundColor: '#ffffff',
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
  },
  statLabel: {
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    marginBottom: 24,
  },
  actionTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  logoutButton: {
    marginTop: 16,
  },
});
