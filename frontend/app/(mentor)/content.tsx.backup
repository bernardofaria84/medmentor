import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Button, DataTable } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';

interface Content {
  id: string;
  title: string;
  content_type: string;
  status: string;
  uploaded_at: string;
}

export default function ContentManagement() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const response = await api.get('/api/mentor/content');
      setContents(response.data);
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'PROCESSING': return '#f59e0b';
      case 'ERROR': return '#ef4444';
      default: return '#64748b';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <View>
            <Text variant="headlineMedium" style={styles.title}>
              Meu Conteúdo
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Gerencie seus materiais de ensino
            </Text>
          </View>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push('/(mentor)/upload')}
            style={styles.uploadButton}
          >
            Novo Upload
          </Button>
        </View>

        {contents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="folder-open" size={64} color="#cbd5e1" />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Nenhum conteúdo ainda
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Faça upload do seu primeiro material para começar
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/(mentor)/upload')}
                style={styles.emptyButton}
              >
                Fazer Upload
              </Button>
            </Card.Content>
          </Card>
        ) : Platform.OS === 'web' ? (
          <Card style={styles.tableCard}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Título</DataTable.Title>
                <DataTable.Title>Tipo</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
                <DataTable.Title>Data de Upload</DataTable.Title>
              </DataTable.Header>

              {contents.map(content => (
                <DataTable.Row key={content.id}>
                  <DataTable.Cell>{content.title}</DataTable.Cell>
                  <DataTable.Cell>
                    <Chip mode="outlined">{content.content_type}</Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <View style={styles.statusContainer}>
                      <MaterialCommunityIcons
                        name={getStatusIcon(content.status)}
                        size={16}
                        color={getStatusColor(content.status)}
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(content.status) }]}>
                        {content.status}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell>{formatDate(content.uploaded_at)}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        ) : (
          contents.map(content => (
            <Card key={content.id} style={styles.contentCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.contentTitle}>
                    {content.title}
                  </Text>
                  <View style={styles.statusContainer}>
                    <MaterialCommunityIcons
                      name={getStatusIcon(content.status)}
                      size={20}
                      color={getStatusColor(content.status)}
                    />
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <Chip mode="outlined" style={styles.typeChip}>
                    {content.content_type}
                  </Chip>
                  <Text variant="bodySmall" style={styles.dateText}>
                    {formatDate(content.uploaded_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
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
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    marginBottom: 24,
    gap: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  uploadButton: {
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
  },
  tableCard: {
    backgroundColor: '#ffffff',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    backgroundColor: '#dbeafe',
  },
  dateText: {
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
});
