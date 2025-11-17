import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, List } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import api from '../../services/api';

export default function QueriesAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/mentor/analytics/queries');
      setData(response.data);
    } catch (error) {
      console.error('Error loading queries analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Análise de Consultas', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </>
    );
  }

  // Prepare chart data
  const lineData = data.daily_data.slice(-14).map((item: any, index: number) => ({
    value: item.count,
    label: new Date(item.date).getDate().toString(),
    dataPointText: item.count.toString()
  }));

  const hourlyData = data.hourly_distribution.map((count: number, hour: number) => ({
    value: count,
    label: `${hour}h`,
    frontColor: hour >= 8 && hour <= 18 ? '#2563eb' : '#94a3b8'
  }));

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Análise de Consultas',
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
              <Text variant="headlineLarge" style={styles.summaryNumber}>
                {data.total_queries}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total de Consultas
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: data.weekly_growth >= 0 ? '#10b981' : '#ef4444' }]}>
            <Card.Content style={styles.summaryContent}>
              <Text variant="headlineLarge" style={styles.summaryNumberWhite}>
                {data.weekly_growth > 0 ? '+' : ''}{data.weekly_growth}%
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabelWhite}>
                Crescimento Semanal
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Line Chart - Last 14 Days */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Consultas - Últimos 14 Dias
            </Text>
            <Text variant="bodySmall" style={styles.chartSubtitle}>
              Evolução diária de perguntas respondidas
            </Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={lineData}
                width={Dimensions.get('window').width - 80}
                height={220}
                spacing={40}
                color="#2563eb"
                thickness={3}
                startFillColor="#dbeafe"
                endFillColor="#ffffff"
                startOpacity={0.8}
                endOpacity={0.3}
                initialSpacing={10}
                noOfSections={4}
                yAxisColor="#cbd5e1"
                xAxisColor="#cbd5e1"
                yAxisTextStyle={{ color: '#64748b' }}
                xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
                hideDataPoints={false}
                dataPointsColor="#2563eb"
                dataPointsRadius={4}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Hourly Distribution */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Distribuição por Horário
            </Text>
            <Text variant="bodySmall" style={styles.chartSubtitle}>
              Horários de pico de consultas
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                <BarChart
                  data={hourlyData}
                  width={800}
                  height={220}
                  barWidth={20}
                  spacing={12}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={1}
                  yAxisTextStyle={{ color: '#64748b' }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 9 }}
                  noOfSections={4}
                  maxValue={Math.max(...data.hourly_distribution) + 2}
                />
              </View>
            </ScrollView>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                <Text variant="bodySmall">Horário comercial (8h-18h)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                <Text variant="bodySmall">Fora do horário</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Queries */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Consultas Recentes
            </Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Últimas 10 perguntas respondidas
            </Text>
            {data.recent_queries.map((query: any, index: number) => (
              <List.Item
                key={index}
                title={query.question}
                description={`Respondido em ${new Date(query.date).toLocaleDateString('pt-BR')}`}
                left={props => <List.Icon {...props} icon="chat-question" color="#2563eb" />}
                style={styles.listItem}
              />
            ))}
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
  },
  summaryNumberWhite: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryLabel: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  summaryLabelWhite: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
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
  chartContainer: {
    paddingVertical: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
});
