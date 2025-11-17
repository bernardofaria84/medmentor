import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, DataTable, List } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import api from '../../services/api';

export default function ContentAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/mentor/analytics/content');
      setData(response.data);
    } catch (error) {
      console.error('Error loading content analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Análise de Conteúdo', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </>
    );
  }

  // Prepare timeline data
  const timelineData = data.upload_timeline.slice(-14).map((item: any) => ({
    value: item.count,
    label: new Date(item.date).getDate().toString(),
    frontColor: '#10b981'
  }));

  // Prepare top content data
  const topContentData = data.top_content.map((item: any) => ({
    value: item.usage_count,
    label: item.title.substring(0, 15),
    frontColor: '#2563eb'
  }));

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'PROCESSING': return '#f59e0b';
      case 'ERROR': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'check-circle';
      case 'PROCESSING': return 'clock-outline';
      case 'ERROR': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Análise de Conteúdo',
          headerShown: true,
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff'
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="file-document" size={32} color="#10b981" />
              <Text variant="headlineLarge" style={styles.summaryNumber}>
                {data.total_content}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total de Conteúdos
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="puzzle" size={32} color="#2563eb" />
              <Text variant="headlineLarge" style={styles.summaryNumber}>
                {data.total_chunks}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Chunks Indexados
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Status Distribution */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Status dos Conteúdos
            </Text>
            <Text variant="bodySmall" style={styles.chartSubtitle}>
              Distribuição por status de processamento
            </Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="check-circle" size={32} color="#10b981" />
                </View>
                <Text variant="headlineMedium" style={styles.statusNumber}>
                  {data.status_distribution.COMPLETED}
                </Text>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  Completos
                </Text>
              </View>

              <View style={styles.statusItem}>
                <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="clock-outline" size={32} color="#f59e0b" />
                </View>
                <Text variant="headlineMedium" style={styles.statusNumber}>
                  {data.status_distribution.PROCESSING}
                </Text>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  Processando
                </Text>
              </View>

              <View style={styles.statusItem}>
                <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={32} color="#ef4444" />
                </View>
                <Text variant="headlineMedium" style={styles.statusNumber}>
                  {data.status_distribution.ERROR}
                </Text>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  Erros
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Upload Timeline */}
        {timelineData.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.chartTitle}>
                Timeline de Uploads
              </Text>
              <Text variant="bodySmall" style={styles.chartSubtitle}>
                Últimos 14 dias
              </Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={timelineData}
                  width={Dimensions.get('window').width - 80}
                  height={220}
                  barWidth={22}
                  spacing={30}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={1}
                  yAxisTextStyle={{ color: '#64748b' }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...timelineData.map((d: any) => d.value)) + 1}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Top Content */}
        {topContentData.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.chartTitle}>
                Conteúdos Mais Utilizados
              </Text>
              <Text variant="bodySmall" style={styles.chartSubtitle}>
                Baseado no número de chunks por conteúdo
              </Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={topContentData}
                  width={Dimensions.get('window').width - 80}
                  height={220}
                  barWidth={30}
                  spacing={20}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={1}
                  yAxisTextStyle={{ color: '#64748b' }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 9, width: 60 }}
                  noOfSections={4}
                  maxValue={Math.max(...topContentData.map((d: any) => d.value)) + 5}
                  horizontal={false}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Content List */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Todos os Conteúdos
            </Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Detalhes de cada material enviado
            </Text>
            {data.content_details.map((content: any) => (
              <List.Item
                key={content.id}
                title={content.title}
                description={`${content.type} • ${content.chunks_count} chunks • ${new Date(content.uploaded_at).toLocaleDateString('pt-BR')}`}
                left={props => (
                  <MaterialCommunityIcons
                    name={getStatusIcon(content.status)}
                    size={24}
                    color={getStatusColor(content.status)}
                    style={{ marginLeft: 16, marginRight: 8 }}
                  />
                )}
                right={props => (
                  <Chip
                    mode="flat"
                    style={{ backgroundColor: getStatusColor(content.status) + '20' }}
                    textStyle={{ color: getStatusColor(content.status) }}
                  >
                    {content.status}
                  </Chip>
                )}
                style={styles.listItem}
              />
            ))}
            {data.content_details.length === 0 && (
              <Text style={styles.noDataText}>
                Nenhum conteúdo enviado ainda
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </>
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
  content: {
    padding: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  summaryContent: {
    alignItems: 'center',
    padding: 16,
  },
  summaryNumber: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  summaryLabel: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  chartTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  chartSubtitle: {
    color: '#64748b',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusNumber: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusLabel: {
    color: '#64748b',
  },
  chartContainer: {
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#64748b',
    marginBottom: 16,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  noDataText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 32,
  },
});
