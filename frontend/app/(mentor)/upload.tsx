import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, TextInput, Button, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import { useAppTheme } from '../../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type FileTypeInfo = {
  label: string;
  icon: string;
  mime: string[];
  ext: string;
  color: string;
};

const FILE_TYPES: Record<string, FileTypeInfo> = {
  pdf: { label: 'PDF', icon: 'file-pdf-box', mime: ['application/pdf'], ext: '.pdf', color: '#EF4444' },
  docx: { label: 'Word (DOCX)', icon: 'file-word-box', mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], ext: '.docx', color: '#3B82F6' },
  video: { label: 'Vídeo (MP4)', icon: 'file-video-outline', mime: ['video/mp4'], ext: '.mp4', color: '#8B5CF6' },
  audio: { label: 'Áudio (MP3/WAV)', icon: 'file-music-outline', mime: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'], ext: '.mp3/.wav', color: '#F59E0B' },
};

export default function UploadContent() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<any>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const { colors } = useAppTheme();

  const pickDocument = async () => {
    try {
      const mimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4',
        'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg',
        '*/*',
      ];
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFile(asset);
        const name = asset.name || '';
        // Auto-detect type
        let detected = 'pdf';
        if (name.endsWith('.docx')) detected = 'docx';
        else if (name.endsWith('.mp4')) detected = 'video';
        else if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.ogg') || name.endsWith('.flac')) detected = 'audio';
        setFileType(detected);
        if (!title) {
          setTitle(name.replace(/\.[^/.]+$/, ''));
        }
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Erro ao selecionar arquivo');
    }
  };

  const getFileMime = () => {
    if (!file || !fileType) return 'application/octet-stream';
    const ft = FILE_TYPES[fileType];
    return ft?.mime[0] || 'application/octet-stream';
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
      const mime = getFileMime();
      
      // For web and mobile compatibility
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const webFile = new File([blob], file.name, { type: mime });
        formData.append('file', webFile);
      } else {
        formData.append('file', {
          uri: file.uri,
          type: mime,
          name: file.name,
        } as any);
      }

      const response = await api.post('/api/mentor/content/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setProgress(percentCompleted / 100);
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === 'web') {
        window.alert('Conteúdo enviado com sucesso! Está sendo processado.');
        router.back();
      } else {
        Alert.alert(
          'Sucesso!',
          'Conteúdo enviado e está sendo processado.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const currentTypeInfo = fileType ? FILE_TYPES[fileType] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              Upload de Conteúdo
            </Text>
            <Text variant="bodyMedium" style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Envie PDF, DOCX, vídeos ou áudios para enriquecer sua base de conhecimento
            </Text>

            {/* File type selector */}
            <View style={styles.typeGrid}>
              {Object.entries(FILE_TYPES).map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFileType(key)}
                  style={[
                    styles.typeBtn,
                    { borderColor: fileType === key ? info.color : colors.border, borderWidth: fileType === key ? 2 : 1 },
                    fileType === key && { backgroundColor: info.color + '15' },
                  ]}
                >
                  <MaterialCommunityIcons name={info.icon as any} size={24} color={fileType === key ? info.color : colors.textSecondary} />
                  <Text style={{ color: fileType === key ? info.color : colors.textSecondary, fontSize: 11, fontFamily: 'Inter_700Bold', marginTop: 4, textAlign: 'center' }}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Título do Conteúdo"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              disabled={uploading}
              placeholder="Ex: Guia de Cardiologia Avançada"
            />

            <Card style={[styles.fileCard, { backgroundColor: colors.surfaceVariant }]} onPress={!uploading ? pickDocument : undefined}>
              <Card.Content style={styles.fileContent}>
                <MaterialCommunityIcons
                  name={(file && currentTypeInfo ? currentTypeInfo.icon : 'cloud-upload') as any}
                  size={48}
                  color={file && currentTypeInfo ? currentTypeInfo.color : colors.textTertiary}
                />
                <Text variant="titleMedium" style={[styles.fileName, { color: colors.text }]}>
                  {file ? file.name : `Selecionar arquivo${fileType ? ' ' + FILE_TYPES[fileType].label : ''}`}
                </Text>
                {file && (
                  <Text variant="bodySmall" style={[styles.fileSize, { color: colors.textSecondary }]}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
                {!file && (
                  <Text variant="bodySmall" style={[styles.fileHint, { color: colors.textTertiary }]}>
                    Formatos: PDF, DOCX, MP4, MP3, WAV
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    minWidth: 70,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
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
