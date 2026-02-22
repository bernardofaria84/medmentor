import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Appbar, Menu, Chip, Divider, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { BarChart } from 'react-native-gifted-charts';
import MentorOnboarding from '../../components/MentorOnboarding';

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/mentor/impactometer');
      setData(response.data);
      if (response.data.total_content === 0 && response.data.total_queries === 0) {
        setShowOnboarding(true);
      }
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

  const getChartData = () => {
    if (!data?.queries_timeline) return [];
    const recent = data.queries_timeline.slice(-14);
    return recent.map((item, index) => ({
      value: item.count,
      label: index % 2 === 0 ? item.label : '',
      frontColor: item.count > 0 ? colors.primary : colors.border,
      topLabelComponent: () => (
        item.count > 0 ? (
          <Text style={{ fontSize: 10, color: colors.text, fontWeight: 'bold' }}>
            {item.count}
          </Text>
        ) : null
      ),
    }));
  };

  const getTopicColor = (index: number) => {
    const c = [colors.primary, '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    return c[Math.min(index, c.length - 1)];
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando Impactometro...</Text>
      </View>
    );
  }

  const totalFeedback = (data?.likes || 0) + (data?.dislikes || 0);

  if (showOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header style={[styles.appbar, { backgroundColor: colors.headerBg }]}>
          <Appbar.Content title="Bem-vindo!" titleStyle={styles.appbarTitle} />
        </Appbar.Header>
        <MentorOnboarding
          mentorName={user?.full_name || 'Dr(a)'}
          onDismiss={() => setShowOnboarding(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.appbar, { backgroundColor: colors.headerBg }]}>
        <Appbar.Content title="Impactometro" titleStyle={styles.appbarTitle} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="menu"
              onPress={() => setMenuVisible(true)}
              color={colors.headerText}
            />
          }
        >
          <Menu.Item onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/dashboard'); }} title="Dashboard" leadingIcon="view-dashboard" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/upload'); }} title="Upload de Conteudo" leadingIcon="upload" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/content'); }} title="Gerenciar Conteudo" leadingIcon="folder" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigateTo('/(mentor)/profile'); }} title="Meu Perfil" leadingIcon="account" />
          <Menu.Item onPress={handleLogout} title="Sair" leadingIcon="logout" />
        </Menu>
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text variant="headlineMedium" style={[styles.welcomeText, { color: colors.text }]}>
          Bem-vindo, Dr(a)!
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginBottom: 20 }}>
          Acompanhe o impacto das suas consultas em tempo real
        </Text>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, { backgroundColor: colors.kpiPrimary }]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="message-text-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_queries || 0}</Text>
              <Text style={styles.kpiLabel}>Consultas</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.kpiCard, { backgroundColor: colors.kpiSecondary }]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="account-group-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_users || 0}</Text>
              <Text style={styles.kpiLabel}>Pacientes</Text>
            </Card.Content>
          </Card>
        </View>
        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, { backgroundColor: colors.kpiSuccess }]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="thumb-up-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.like_rate || 0}%</Text>
              <Text style={styles.kpiLabel}>Aprovacao</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.kpiCard, { backgroundColor: colors.kpiInfo }]}>
            <Card.Content style={styles.kpiContent}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#ffffff" />
              <Text style={styles.kpiNumber}>{data?.total_content || 0}</Text>
              <Text style={styles.kpiLabel}>Conteudos</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Feedback */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Avaliacoes dos Pacientes
            </Text>
            <View style={styles.feedbackRow}>
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="thumb-up" size={24} color={colors.success} />
                <Text style={[styles.feedbackCount, { color: colors.success }]}>{data?.likes || 0}</Text>
                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>Positivas</Text>
              </View>
              <View style={[styles.feedbackDivider, { backgroundColor: colors.border }]} />
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="thumb-down" size={24} color={colors.error} />
                <Text style={[styles.feedbackCount, { color: colors.error }]}>{data?.dislikes || 0}</Text>
                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>Negativas</Text>
              </View>
              <View style={[styles.feedbackDivider, { backgroundColor: colors.border }]} />
              <View style={styles.feedbackItem}>
                <MaterialCommunityIcons name="chart-donut" size={24} color={colors.primary} />
                <Text style={[styles.feedbackCount, { color: colors.primary }]}>{totalFeedback}</Text>
                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
            </View>
            {totalFeedback > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Taxa de aprovacao</Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.success }}>{data?.like_rate || 0}%</Text>
                </View>
                <ProgressBar progress={(data?.like_rate || 0) / 100} color={colors.success} style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]} />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Chart */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Consultas nos Ultimos 14 Dias
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
                  yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  noOfSections={4}
                  maxValue={Math.max(...getChartData().map(d => d.value), 5)}
                  isAnimated
                  animationDuration={800}
                  height={160}
                  barBorderRadius={4}
                  frontColor={colors.primary}
                  rulesType="solid"
                  rulesColor={colors.surfaceVariant}
                  xAxisColor={colors.border}
                  yAxisColor={colors.border}
                />
              </View>
            ) : (
              <Text style={{ color: colors.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' }}>
                Nenhuma consulta registrada ainda
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Hot Topics */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Topicos Mais Consultados
            </Text>
            {data?.hot_topics && data.hot_topics.length > 0 ? (
              <View style={styles.topicsContainer}>
                {data.hot_topics.map((topic, index) => (
                  <Chip
                    key={topic.word}
                    style={[styles.topicChip, { backgroundColor: colors.surfaceVariant, borderColor: getTopicColor(index) }]}
                    textStyle={{ color: getTopicColor(index), fontSize: Math.max(12, 18 - index), fontWeight: index < 3 ? 'bold' : 'normal' }}
                  >
                    {topic.word} ({topic.count})
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={{ color: colors.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' }}>
                Nenhum topico identificado ainda
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Recent Queries */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
              Consultas Recentes
            </Text>
            {data?.recent_queries && data.recent_queries.length > 0 ? (
              data.recent_queries.map((query, index) => (
                <View key={index}>
                  <View style={styles.queryItem}>
                    <MaterialCommunityIcons name="message-outline" size={18} color={colors.textTertiary} />
                    <View style={styles.queryContent}>
                      <Text variant="bodyMedium" style={{ color: colors.text, lineHeight: 20 }} numberOfLines={2}>
                        {query.question}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.textTertiary, marginTop: 4 }}>
                        {new Date(query.sent_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  {index < (data.recent_queries.length - 1) && <Divider style={{ backgroundColor: colors.border, marginVertical: 2 }} />}
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' }}>
                Nenhuma consulta recente
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text, marginTop: 8, marginBottom: 12 }}>
          Acoes Rapidas
        </Text>

        <Pressable onPress={() => navigateTo('/(mentor)/upload')}>
          <Card style={[styles.actionCard, { backgroundColor: colors.primary }]}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="upload" size={36} color="#ffffff" />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: 2 }}>Upload de Conteudo</Text>
                <Text variant="bodySmall" style={{ color: '#e0e7ff' }}>Envie novos materiais em PDF</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/content')}>
          <Card style={[styles.actionCard, { backgroundColor: colors.card }]}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="folder" size={36} color={colors.primary} />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text, marginBottom: 2 }}>Gerenciar Conteudo</Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Veja e gerencie seus materiais</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
            </Card.Content>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigateTo('/(mentor)/profile')}>
          <Card style={[styles.actionCard, { backgroundColor: colors.card }]}>
            <Card.Content style={styles.actionCardContent}>
              <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
              <View style={styles.actionCardRight}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text, marginBottom: 2 }}>Meu Perfil</Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Gerencie seu perfil e bot de IA</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  appbar: {
    elevation: 2,
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
    marginBottom: 4,
  },
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
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
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
    marginTop: 6,
  },
  feedbackLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  feedbackDivider: {
    width: 1,
    height: 40,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  chartContainer: {
    marginTop: 8,
    paddingRight: 8,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    borderWidth: 1,
    marginBottom: 4,
  },
  queryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  queryContent: {
    flex: 1,
    marginLeft: 10,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 12,
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
});
