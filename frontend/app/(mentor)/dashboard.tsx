import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Appbar, Menu, Chip, Divider, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart } from 'react-native-gifted-charts';

interface ImpactometerData {
  total_queries: number;
  total_users: number;
  total_conversations: number;
  total_content: number;
  likes: number;
  dislikes: number;
  like_rate: number;
  queries_timeline: { date: string; label: string; count: number }[];
  hot_topics: { word: string; count: number }[];
  recent_queries: { question: string; sent_at: string }[];
}

export default function MentorDashboard() {
  const [data, setData] = useState<ImpactometerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/mentor/impactometer');
      setData(response.data);
    } catch (error) {
      console.error('Error loading impactometer:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(mentor)/login');
  };

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  // Prepare chart data
  const getChartData = () => {
    if (!data?.queries_timeline) return [];
    
    // Show last 14 days for readability
    const recent = data.queries_timeline.slice(-14);
    return recent.map((item, index) => ({
      value: item.count,
      label: index % 2 === 0 ? item.label : '',
      frontColor: item.count > 0 ? '#2563eb' : '#e2e8f0',
      topLabelComponent: () => (
        item.count > 0 ? (
          <Text style={{ fontSize: 10, color: '#1e293b', fontWeight: 'bold' }}>
            {item.count}
          </Text>
        ) : null
      ),
    }));
  };

  // Get topic color based on rank
  const getTopicColor = (index: number) => {
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    return colors[Math.min(index, colors.length - 1)];
  };

  const getTopicBg = (index: number) => {
    const colors = ['#eff6ff', '#f0f7ff', '#f5f9ff', '#f8fbff', '#fafcff', '#fdfdff'];
    return colors[Math.min(index, colors.length - 1)];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando Impactômetro...</Text>
      </View>
    );
  }

  const totalFeedback = (data?.likes || 0) + (data?.dislikes || 0);

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="Impactômetro" titleStyle={styles.appbarTitle} />
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
            onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/dashboard'); }}
            title="Dashboard"
            leadingIcon="view-dashboard"
          />
          <Menu.Item
            onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/upload'); }}
            title="Upload de Conteúdo"
            leadingIcon="upload"
          />
          <Menu.Item
            onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/content'); }}
            title="Gerenciar Conteúdo"
            leadingIcon="folder"
          />
          <Menu.Item
            onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/profile'); }}
            title="Meu Perfil"
            leadingIcon="account"
          />
          <Menu.Item onPress={handleLogout} title="Sair" leadingIcon="logout" />
        </Menu>
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
      >
        {/* Header */}
        <Text variant="headlineMedium" style={styles.welcomeText}>
          Bem-vindo, Dr(a)!
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Acompanhe o impacto das suas consultas em tempo real
        </Text>

        {/* === KPI Cards === */}
        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, styles.kpiPrimary]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="message-text-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_queries || 0}</Text>
              <Text style={styles.kpiLabel}>Consultas</Text>
            </Card.Content>
          </Card>
          
          <Card style={[styles.kpiCard, styles.kpiSecondary]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="account-group-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_users || 0}</Text>
              <Text style={styles.kpiLabel}>Pacientes</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, styles.kpiSuccess]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="thumb-up-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.like_rate || 0}%</Text>
              <Text style={styles.kpiLabel}>Aprovação</Text>
            </Card.Content>
          </Card>
          
          <Card style={[styles.kpiCard, styles.kpiInfo]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_content || 0}</Text>
              <Text style={styles.kpiLabel}>Conteúdos</Text>
            </Card.Content>
          </Card>
        </View>

        {/* === Feedback Breakdown === */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Avaliações dos Pacientes
            </Text>
            
            <View style={styles.feedbackRow}>
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="thumb-up" size={24} color="#22c55e" />
                <Text style={styles.feedbackCount}>{data?.likes || 0}</Text>
                <Text style={styles.feedbackLabel}>Positivas</Text>
              </View>
              <View style={styles.feedbackDivider} />
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="thumb-down" size={24} color="#ef4444" />
                <Text style={[styles.feedbackCount, { color: '#ef4444' }]}>{data?.dislikes || 0}</Text>
                <Text style={styles.feedbackLabel}>Negativas</Text>
              </View>
              <View style={styles.feedbackDivider} />
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="chart-donut" size={24} color="#2563eb" />
                <Text style={[styles.feedbackCount, { color: '#2563eb' }]}>{totalFeedback}</Text>
                <Text style={styles.feedbackLabel}>Total</Text>
              </View>
            </View>

            {totalFeedback > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Taxa de aprovação</Text>
                  <Text style={styles.progressValue}>{data?.like_rate || 0}%</Text>
                </View>
                <ProgressBar 
                  progress={(data?.like_rate || 0) / 100} 
                  color="#22c55e" 
                  style={styles.progressBar}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* === Queries Timeline Chart === */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Consultas nos Últimos 14 Dias
            </Text>
            
            {getChartData().length > 0 ? (
              <View style={styles.chartContainer}>
                <BarChart
                  data={getChartData()}
                  barWidth={16}
                  spacing={8}
                  roundedTop
                  xAxisThickness={1}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 9, transform: [{ rotate: '-45deg' }] }}
                  noOfSections={4}
                  maxValue={Math.max(...getChartData().map(d => d.value), 5)}
                  isAnimated
                  animationDuration={800}
                  height={160}
                  barBorderRadius={4}
                  frontColor="#2563eb"
                  rulesType="solid"
                  rulesColor="#f1f5f9"
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhuma consulta registrada ainda</Text>
            )}
          </Card.Content>
        </Card>

        {/* === Hot Topics (Word Cloud as Tags) === */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tópicos Mais Consultados
            </Text>
            
            {data?.hot_topics && data.hot_topics.length > 0 ? (
              <View style={styles.topicsContainer}>
                {data.hot_topics.map((topic, index) => (
                  <Chip
                    key={topic.word}
                    style={[
                      styles.topicChip,
                      { backgroundColor: getTopicBg(index), borderColor: getTopicColor(index) }
                    ]}
                    textStyle={[
                      styles.topicChipText,
                      { 
                        color: getTopicColor(index),
                        fontSize: Math.max(12, 18 - index),
                        fontWeight: index < 3 ? 'bold' : 'normal'
                      }
                    ]}
                  >
                    {topic.word} ({topic.count})
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhum tópico identificado ainda</Text>
            )}
          </Card.Content>
        </Card>

        {/* === Recent Queries === */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Consultas Recentes
            </Text>
            
            {data?.recent_queries && data.recent_queries.length > 0 ? (
              data.recent_queries.map((query, index) => (
                <View key={index}>
                  <View style={styles.queryItem}>
                    <MaterialCommunityIcons name="message-outline" size={18} color="#94a3b8" />
                    <View style={styles.queryContent}>
                      <Text variant="bodyMedium" style={styles.queryText} numberOfLines={2}>
                        {query.question}
                      </Text>
                      <Text variant="bodySmall" style={styles.queryDate}>
                        {new Date(query.sent_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  {index < (data.recent_queries.length - 1) && <Divider style={styles.queryDivider} />}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nenhuma consulta recente</Text>
            )}
          </Card.Content>
        </Card>

        {/* === Quick Actions === */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 8, marginBottom: 12 }]}>
          Ações Rápidas
        </Text>

        <Pressable onPress={() => navigateTo('/(mentor)/upload')}>
          <Card style={[styles.actionCard, styles.primaryActionCard]}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="upload" size={36} color="#ffffff" />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitle}>Upload de Conteúdo</Text>
                <Text variant="bodySmall" style={styles.actionCardDesc}>Envie novos materiais em PDF</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/content')}>
          <Card style={styles.actionCard}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="folder" size={36} color="#2563eb" />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitleDark}>Gerenciar Conteúdo</Text>
                <Text variant="bodySmall" style={styles.actionCardDescDark}>Veja e gerencie seus materiais</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#2563eb" />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/profile')}>
          <Card style={styles.actionCard}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="account" size={36} color="#2563eb" />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={styles.actionCardTitleDark}>Meu Perfil</Text>
                <Text variant="bodySmall" style={styles.actionCardDescDark}>Gerencie seu perfil e bot de IA</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#2563eb" />
            </Card.Content>
          </Card>
        </Pressable>

        <View style={{ height: 32 }} />
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
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  appbar: {
    backgroundColor: '#2563eb',
  },
  appbarTitle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  scrollContent: {
    padding: 16,
    maxWidth: 800,
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
    marginBottom: 20,
  },

  // KPI Cards
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 2,
  },
  kpiPrimary: { backgroundColor: '#2563eb' },
  kpiSecondary: { backgroundColor: '#7c3aed' },
  kpiSuccess: { backgroundColor: '#059669' },
  kpiInfo: { backgroundColor: '#0891b2' },
  kpiContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  kpiNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Section Cards
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },

  // Feedback
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feedbackItem: {
    alignItems: 'center',
    flex: 1,
  },
  feedbackCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    marginTop: 6,
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  feedbackDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },

  // Chart
  chartContainer: {
    marginTop: 8,
    paddingRight: 8,
  },

  // Topics
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    borderWidth: 1,
    marginBottom: 4,
  },
  topicChipText: {
    fontSize: 13,
  },

  // Recent Queries
  queryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  queryContent: {
    flex: 1,
    marginLeft: 10,
  },
  queryText: {
    color: '#374151',
    lineHeight: 20,
  },
  queryDate: {
    color: '#94a3b8',
    marginTop: 4,
  },
  queryDivider: {
    marginVertical: 2,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },

  // Action Cards
  actionCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  primaryActionCard: {
    backgroundColor: '#2563eb',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionCardRight: {
    flex: 1,
    marginLeft: 14,
  },
  actionCardTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  actionCardTitleDark: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  actionCardDesc: {
    color: '#e0e7ff',
  },
  actionCardDescDark: {
    color: '#64748b',
  },
});
