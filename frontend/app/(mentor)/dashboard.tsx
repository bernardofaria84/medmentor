import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator, Appbar, Menu, IconButton } from 'react-native-paper';
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
  const [menuVisible, setMenuVisible] = useState(false);
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

  const navigateTo = (route: string) => {
    console.log('Navigating to:', route);
    router.push(route as any);
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
      {/* Top Navigation Bar */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="MedMentor" subtitle="Portal do Mentor" />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="menu"
              onPress={() => setMenuVisible(true)}
              color="#ffffff"
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigateTo('/(mentor)/dashboard');
            }}
            title="Dashboard"
            leadingIcon="view-dashboard"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigateTo('/(mentor)/upload');
            }}
            title="Upload de Conteúdo"
            leadingIcon="upload"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigateTo('/(mentor)/content');
            }}
            title="Gerenciar Conteúdo"
            leadingIcon="folder"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigateTo('/(mentor)/profile');
            }}
            title="Meu Perfil"
            leadingIcon="account"
          />
          <Menu.Item onPress={handleLogout} title="Sair" leadingIcon="logout" />
        </Menu>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.welcomeText}>
          Bem-vindo, Dr(a)!
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Aqui está um resumo da sua atividade
        </Text>

        {/* Stats Grid */}
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

        {/* Action Cards */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Ações Rápidas
        </Text>

        <Pressable onPress={() => navigateTo('/(mentor)/upload')}>
          <Card style={[styles.actionCard, styles.primaryActionCard]}>
            <Card.Content style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <MaterialCommunityIcons name="upload" size={40} color="#ffffff" />
              </View>
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitle}>
                  Upload de Conteúdo
                </Text>
                <Text variant="bodySmall" style={styles.actionCardDescription}>
                  Envie novos materiais em PDF
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/content')}>
          <Card style={styles.actionCard}>
            <Card.Content style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <MaterialCommunityIcons name="folder" size={40} color="#2563eb" />
              </View>
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitleDark}>
                  Gerenciar Conteúdo
                </Text>
                <Text variant="bodySmall" style={styles.actionCardDescriptionDark}>
                  Veja e gerencie seus materiais
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#2563eb" />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/profile')}>
          <Card style={styles.actionCard}>
            <Card.Content style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <MaterialCommunityIcons name="account" size={40} color="#2563eb" />
              </View>
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitleDark}>
                  Editar Perfil
                </Text>
                <Text variant="bodySmall" style={styles.actionCardDescriptionDark}>
                  Atualize suas informações
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#2563eb" />
            </Card.Content>
          </Card>
        </Pressable>
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
  appbar: {
    backgroundColor: '#2563eb',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    margin: 8,
    minWidth: Platform.OS === 'web' ? 250 : 150,
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
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionCard: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  primaryActionCard: {
    backgroundColor: '#2563eb',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionCardLeft: {
    marginRight: 16,
  },
  actionCardRight: {
    flex: 1,
  },
  actionCardTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionCardTitleDark: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionCardDescription: {
    color: '#e0e7ff',
  },
  actionCardDescriptionDark: {
    color: '#64748b',
  },
});
