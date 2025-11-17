import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, ProgressBar, List } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import api from '../../services/api';

export default function RatingsAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/mentor/analytics/ratings');
      setData(response.data);
    } catch (error) {
      console.error('Error loading ratings analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Análise de Avaliações', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </>
    );
  }

  // Prepare pie chart data
  const pieData = [
    { value: data.like_percentage, color: '#10b981', text: `${data.like_percentage}%` },
    { value: data.dislike_percentage, color: '#ef4444', text: `${data.dislike_percentage}%` },
  ];

  // Prepare line chart data
  const lineData = data.rating_timeline.slice(-14).map((item: any) => ({
    value: item.rating,
    label: new Date(item.date).getDate().toString(),
    dataPointText: item.rating.toFixed(1)
  }));

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Análise de Avaliações',
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
              <MaterialCommunityIcons name="star" size={32} color="#f59e0b" />
              <Text variant="headlineLarge" style={styles.summaryNumber}>
                {data.average_rating.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Avaliação Média
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="comment-text" size={32} color="#2563eb" />
              <Text variant="headlineLarge" style={styles.summaryNumber}>
                {data.total_feedbacks}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total de Feedbacks
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Feedback Distribution */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Distribuição de Feedback
            </Text>
            <Text variant="bodySmall" style={styles.chartSubtitle}>
              Proporção de avaliações positivas e negativas
            </Text>
            <View style={styles.pieContainer}>
              {data.total_feedbacks > 0 ? (
                <PieChart
                  data={pieData}
                  donut
                  showText
                  textColor="#ffffff"
                  textSize={16}
                  radius={100}
                  innerRadius={60}
                  innerCircleColor="#f8fafc"
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>
                        {data.average_rating.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>de 5.0</Text>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.noDataText}>Sem feedbacks ainda</Text>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="thumb-up" size={24} color="#10b981" />
                <Text variant="titleMedium" style={styles.statNumber}>
                  {data.like_count}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Positivos
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="thumb-down" size={24} color="#ef4444" />
                <Text variant="titleMedium" style={styles.statNumber}>
                  {data.dislike_count}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Negativos
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Rating Timeline */}
        {lineData.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.chartTitle}>
                Evolução da Avaliação
              </Text>
              <Text variant="bodySmall" style={styles.chartSubtitle}>
                Últimos 14 dias
              </Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={lineData}
                  width={Dimensions.get('window').width - 80}
                  height={220}
                  spacing={40}
                  color="#f59e0b"
                  thickness={3}
                  startFillColor="#fef3c7"
                  endFillColor="#ffffff"
                  startOpacity={0.8}
                  endOpacity={0.3}
                  initialSpacing={10}
                  noOfSections={5}
                  maxValue={5}
                  yAxisColor="#cbd5e1"
                  xAxisColor="#cbd5e1"
                  yAxisTextStyle={{ color: '#64748b' }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
                  hideDataPoints={false}
                  dataPointsColor="#f59e0b"
                  dataPointsRadius={4}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Best Responses */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Melhores Respostas
            </Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Respostas com avaliação positiva
            </Text>
            {data.best_responses.length > 0 ? (
              data.best_responses.map((response: any, index: number) => (
                <List.Item
                  key={index}
                  title={response.content}
                  description={`${new Date(response.date).toLocaleDateString('pt-BR')} • ${response.citations_count} citações`}
                  left={props => <List.Icon {...props} icon="thumb-up" color="#10b981" />}
                  style={styles.listItem}
                />
              ))
            ) : (
              <Text style={styles.noDataText}>Nenhuma resposta com feedback positivo ainda</Text>
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
  pieContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    color: '#64748b',
    marginTop: 4,
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
