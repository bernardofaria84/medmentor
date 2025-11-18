import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  DataTable,
  Checkbox,
  IconButton,
  Portal,
  Modal,
  Divider
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';

interface Content {
  id: string;
  title: string;
  content_type: string;
  status: string;
  uploaded_at: string;
  chunk_count?: number;
}

interface ContentDetails {
  id: string;
  title: string;
  content_type: string;
  status: string;
  uploaded_at: string;
  processed_text: string;
  chunk_count: number;
}

export default function ContentManagement() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [viewingContent, setViewingContent] = useState<ContentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const response = await api.get('/api/mentor/content');
      setContents(response.data);
      setSelectedIds(new Set()); // Clear selection after reload
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContentDetails = async (contentId: string) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/api/mentor/content/${contentId}`);
      setViewingContent(response.data);
    } catch (error) {
      console.error('Error loading content details:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do conteúdo');
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contents.map(c => c.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMessage = selectedIds.size === 1
      ? 'Tem certeza que deseja deletar este conteúdo?'
      : `Tem certeza que deseja deletar ${selectedIds.size} conteúdos?`;

    if (Platform.OS === 'web') {
      if (!confirm(confirmMessage)) return;
    } else {
      Alert.alert(
        'Confirmar Exclusão',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Deletar', style: 'destructive', onPress: () => performDelete() }
        ]
      );
      return;
    }

    await performDelete();
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      if (idsArray.length === 1) {
        // Single delete
        await api.delete(`/api/mentor/content/${idsArray[0]}`);
      } else {
        // Bulk delete
        await api.post('/api/mentor/content/bulk-delete', idsArray);
      }

      // Reload list
      await loadContents();

      if (Platform.OS === 'web') {
        alert(`${idsArray.length} conteúdo(s) deletado(s) com sucesso!`);
      } else {
        Alert.alert('Sucesso', `${idsArray.length} conteúdo(s) deletado(s) com sucesso!`);
      }
    } catch (error: any) {
      console.error('Error deleting contents:', error);
      const message = error.response?.data?.detail || 'Erro ao deletar conteúdo(s)';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Erro', message);
      }
    } finally {
      setDeleting(false);
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
          <View style={styles.headerActions}>
            {selectedIds.size > 0 && (
              <Button
                mode="outlined"
                icon="delete"
                onPress={handleDelete}
                loading={deleting}
                disabled={deleting}
                buttonColor="#fee2e2"
                textColor="#dc2626"
                style={styles.deleteButton}
              >
                Deletar ({selectedIds.size})
              </Button>
            )}
            <Button
              mode="contained"
              icon="plus"
              onPress={() => router.push('/(mentor)/upload')}
            >
              Novo Upload
            </Button>
          </View>
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
                <DataTable.Title style={{ flex: 0.5 }}>
                  <Checkbox
                    status={
                      selectedIds.size === 0
                        ? 'unchecked'
                        : selectedIds.size === contents.length
                        ? 'checked'
                        : 'indeterminate'
                    }
                    onPress={toggleSelectAll}
                  />
                </DataTable.Title>
                <DataTable.Title style={{ flex: 3 }}>Título</DataTable.Title>
                <DataTable.Title style={{ flex: 1 }}>Tipo</DataTable.Title>
                <DataTable.Title style={{ flex: 1.5 }}>Status</DataTable.Title>
                <DataTable.Title style={{ flex: 2 }}>Data de Upload</DataTable.Title>
                <DataTable.Title style={{ flex: 1 }}>Ações</DataTable.Title>
              </DataTable.Header>

              {contents.map(content => (
                <DataTable.Row key={content.id}>
                  <DataTable.Cell style={{ flex: 0.5 }}>
                    <Checkbox
                      status={selectedIds.has(content.id) ? 'checked' : 'unchecked'}
                      onPress={() => toggleSelection(content.id)}
                    />
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 3 }}>{content.title}</DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <Chip mode="outlined" compact>{content.content_type}</Chip>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.5 }}>
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
                  <DataTable.Cell style={{ flex: 2 }}>{formatDate(content.uploaded_at)}</DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <IconButton
                      icon="eye"
                      size={20}
                      onPress={() => loadContentDetails(content.id)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        ) : (
          contents.map(content => (
            <Card key={content.id} style={styles.contentCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Checkbox
                    status={selectedIds.has(content.id) ? 'checked' : 'unchecked'}
                    onPress={() => toggleSelection(content.id)}
                  />
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
                  <IconButton
                    icon="eye"
                    size={20}
                    onPress={() => loadContentDetails(content.id)}
                  />
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

      {/* Modal para visualizar conteúdo */}
      <Portal>
        <Modal
          visible={!!viewingContent}
          onDismiss={() => setViewingContent(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {loadingDetails ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : viewingContent ? (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalHeader}>
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  {viewingContent.title}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setViewingContent(null)}
                />
              </View>

              <View style={styles.modalInfo}>
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.infoLabel}>Tipo:</Text>
                  <Chip mode="outlined">{viewingContent.content_type}</Chip>
                </View>
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.infoLabel}>Status:</Text>
                  <View style={styles.statusContainer}>
                    <MaterialCommunityIcons
                      name={getStatusIcon(viewingContent.status)}
                      size={16}
                      color={getStatusColor(viewingContent.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(viewingContent.status) }]}>
                      {viewingContent.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.infoLabel}>Chunks processados:</Text>
                  <Text variant="bodyMedium">{viewingContent.chunk_count}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.infoLabel}>Data:</Text>
                  <Text variant="bodyMedium">{formatDate(viewingContent.uploaded_at)}</Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.contentSectionTitle}>
                Conteúdo Extraído:
              </Text>

              <Card style={styles.contentTextCard}>
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.contentText}>
                    {viewingContent.processed_text || 'Nenhum texto processado disponível.'}
                  </Text>
                </Card.Content>
              </Card>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>
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
    maxWidth: 1400,
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  deleteButton: {
    borderColor: '#dc2626',
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
    marginLeft: 8,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 48,
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
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  modalScroll: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  modalInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    color: '#64748b',
    minWidth: 140,
  },
  divider: {
    marginVertical: 16,
  },
  contentSectionTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  contentTextCard: {
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  contentText: {
    color: '#1e293b',
    lineHeight: 24,
  },
});
