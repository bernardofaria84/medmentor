import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { Text, Card, TextInput, Button, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';

export default function UploadContent() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFile(result.assets[0]);
        if (!title) {
          setTitle(result.assets[0].name.replace('.pdf', ''));
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Erro ao selecionar arquivo');
    }
  };

  const handleUpload = async () => {
    if (!title || !file) {
      Alert.alert('Erro', 'Por favor, preencha o título e selecione um arquivo');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title);
      
      // For web and mobile compatibility
      if (Platform.OS === 'web') {
        // On web, we need to fetch the file as a Blob first
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const webFile = new File([blob], file.name, { type: 'application/pdf' });
        formData.append('file', webFile);
      } else {
        formData.append('file', {
          uri: file.uri,
          type: 'application/pdf',
          name: file.name,
        } as any);
      }

      const response = await api.post('/api/mentor/content/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setProgress(percentCompleted / 100);
        },
      });

      Alert.alert(
        'Sucesso!',
        'Conteúdo enviado e está sendo processado. Você será notificado quando estiver pronto.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Upload de Conteúdo
            </Text>
            <Text variant="bodyMedium" style={styles.cardSubtitle}>
              Envie materiais em PDF para enriquecer sua base de conhecimento
            </Text>

            <TextInput
              label="Título do Conteúdo"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              disabled={uploading}
              placeholder="Ex: Guia de Cardiologia Avançada"
            />

            <Card style={styles.fileCard} onPress={!uploading ? pickDocument : undefined}>
              <Card.Content style={styles.fileContent}>
                <MaterialCommunityIcons
                  name={file ? 'file-pdf-box' : 'cloud-upload'}
                  size={48}
                  color={file ? '#ef4444' : '#94a3b8'}
                />
                <Text variant="titleMedium" style={styles.fileName}>
                  {file ? file.name : 'Selecionar arquivo PDF'}
                </Text>
                {file && (
                  <Text variant="bodySmall" style={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
                {!file && (
                  <Text variant="bodySmall" style={styles.fileHint}>
                    Clique para selecionar um arquivo PDF
                  </Text>
                )}
              </Card.Content>
            </Card>

            {uploading && (
              <View style={styles.progressContainer}>
                <Text variant="bodySmall" style={styles.progressText}>
                  Fazendo upload... {Math.round(progress * 100)}%
                </Text>
                <ProgressBar progress={progress} color="#2563eb" style={styles.progressBar} />
              </View>
            )}

            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information" size={20} color="#2563eb" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoText}>
                  <Text style={styles.infoBold}>Dica:</Text> O conteúdo será automaticamente processado e indexado. Isso pode levar alguns minutos dependendo do tamanho do arquivo.
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => router.back()}
                disabled={uploading}
                style={styles.button}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleUpload}
                loading={uploading}
                disabled={uploading || !title || !file}
                style={styles.button}
              >
                Fazer Upload
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#64748b',
    marginBottom: 24,
  },
  input: {
    marginBottom: 24,
  },
  fileCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  fileContent: {
    alignItems: 'center',
    padding: 32,
  },
  fileName: {
    color: '#1e293b',
    marginTop: 12,
    textAlign: 'center',
  },
  fileSize: {
    color: '#64748b',
    marginTop: 4,
  },
  fileHint: {
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    color: '#1e40af',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  button: {
    flex: Platform.OS === 'web' ? 0 : 1,
    minWidth: Platform.OS === 'web' ? 120 : undefined,
  },
});
