import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Card, Chip, ActivityIndicator, IconButton, Button, Portal, Modal } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import { sendChatMessage, getConversationMessages, getConversations } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import api from '../../services/api';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAppTheme } from '../../contexts/ThemeContext';

function exportSOAPAsPDF(soapSummary: string) {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Resumo SOAP - MedMentor</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1e293b; line-height: 1.6; }
h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
h2, h3 { color: #334155; margin-top: 24px; }
p { margin: 8px 0; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
@media print { body { margin: 20px; } }
</style></head><body>
<h1>Resumo SOAP</h1>
${soapSummary.replace(/\n/g, '<br/>')}
<div class="footer">Gerado por MedMentor - ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  } else {
    Alert.alert('Exportar PDF', 'A exportacao PDF esta disponivel apenas na versao web.');
  }
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useAppTheme();

  // SOAP Modal states
  const [showSOAPModal, setShowSOAPModal] = useState(false);
  const [soapSummary, setSOAPSummary] = useState('');
  const [loadingSOAP, setLoadingSOAP] = useState(false);

  // Audio recording
  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    error: audioError
  } = useAudioRecorder();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setInputText(prev => prev ? `${prev} ${text}` : text);
      }
    } else {
      await startRecording();
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const messagesData = await getConversationMessages(conversationId as string);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const question = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    try {
      setSending(true);
      const conversations = await getConversations();
      const currentConv = conversations.find(
        (c: any) => c.id === conversationId
      );

      if (!currentConv) {
        throw new Error('Conversation not found');
      }

      await sendChatMessage(currentConv.mentor_id, question, conversationId as string);
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Erro', error.message || 'Nao foi possivel enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  const generateSOAPSummary = async () => {
    if (messages.length < 2) {
      Alert.alert(
        'Conversa muito curta',
        'Sao necessarias pelo menos 2 mensagens para gerar um resumo SOAP.'
      );
      return;
    }

    setLoadingSOAP(true);
    try {
      const response = await api.post(`/api/conversations/${conversationId}/summarize`);
      setSOAPSummary(response.data.soap_summary);
      setShowSOAPModal(true);
    } catch (error: any) {
      console.error('Error generating SOAP:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Nao foi possivel gerar o resumo SOAP'
      );
    } finally {
      setLoadingSOAP(false);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(soapSummary);
    Alert.alert('Copiado!', 'Resumo SOAP copiado para a area de transferencia');
  };

  const renderMessage = (message: any) => {
    const isUser = message.sender_type === 'USER';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Card
          style={[
            styles.messageCard,
            isUser
              ? [styles.userCard, { backgroundColor: colors.primary }]
              : [styles.botCard, { backgroundColor: colors.card }],
          ]}
        >
          <Card.Content>
            <Markdown style={isUser ? markdownStylesUser : { body: { color: colors.text } }}>
              {message.content}
            </Markdown>
            {message.citations && message.citations.length > 0 && (
              <View style={[styles.citationsContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.citationsTitle, { color: colors.textTertiary }]}>Fontes:</Text>
                {message.citations.map((citation: any, index: number) => (
                  <Chip
                    key={index}
                    style={[styles.citationChip, { backgroundColor: colors.surfaceVariant }]}
                    textStyle={{ fontSize: 10, color: colors.textSecondary }}
                  >
                    {citation.title}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Conversa',
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          headerRight: () => (
            <IconButton
              icon="briefcase-edit-outline"
              onPress={generateSOAPSummary}
              disabled={loadingSOAP}
              iconColor={colors.headerText}
              data-testid="soap-generate-btn"
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map(renderMessage)}
          {sending && (
            <View style={styles.loadingMessage}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Enviando...</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {isRecording && (
            <View style={styles.recordingBar}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Gravando... {formatDuration(recordingDuration)}
              </Text>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordBtn}>
                <Text style={styles.cancelRecordText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {isTranscribing && (
            <View style={[styles.transcribingBar, { backgroundColor: colors.primaryLight }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.transcribingText, { color: colors.primary }]}>Transcrevendo audio...</Text>
            </View>
          )}

          {audioError && !isRecording && !isTranscribing && (
            <View style={styles.audioErrorBar}>
              <Text style={styles.audioErrorText}>{audioError}</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <IconButton
              icon={isRecording ? "stop-circle" : "microphone"}
              iconColor={isRecording ? colors.error : colors.primary}
              size={24}
              onPress={handleMicPress}
              disabled={sending || isTranscribing}
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              data-testid="mic-btn"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite ou grave sua pergunta..."
              placeholderTextColor={colors.textTertiary}
              multiline
              onSubmitEditing={handleSend}
              disabled={sending || isRecording}
              textColor={colors.text}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSend}
                  disabled={sending || !inputText.trim()}
                  color={inputText.trim() && !sending ? colors.primary : colors.textTertiary}
                />
              }
              data-testid="message-input"
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* SOAP Summary Modal */}
      <Portal>
        <Modal
          visible={showSOAPModal}
          onDismiss={() => setShowSOAPModal(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="headlineSmall" style={[styles.modalTitle, { color: colors.text }]}>
                Resumo SOAP
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowSOAPModal(false)}
                iconColor={colors.textSecondary}
              />
            </View>

            <ScrollView style={styles.soapContent}>
              <Markdown style={{ body: { color: colors.text } }}>{soapSummary}</Markdown>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="contained"
                icon="content-copy"
                onPress={copyToClipboard}
                style={styles.actionBtn}
                data-testid="soap-copy-btn"
              >
                Copiar
              </Button>
              <Button
                mode="contained-tonal"
                icon="file-pdf-box"
                onPress={() => exportSOAPAsPDF(soapSummary)}
                style={styles.actionBtn}
                data-testid="soap-export-pdf-btn"
              >
                Exportar PDF
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const markdownStylesUser = {
  body: { color: '#ffffff' },
  heading1: { color: '#ffffff' },
  heading2: { color: '#ffffff' },
  strong: { fontWeight: 'bold' as const },
  link: { color: '#bfdbfe' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  userCard: {},
  botCard: {},
  citationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  citationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  citationChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  micButton: {
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: '#f0f7ff',
  },
  micButtonRecording: {
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    flex: 1,
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelRecordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  cancelRecordText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  transcribingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  transcribingText: {
    marginLeft: 10,
    fontWeight: '500',
    fontSize: 14,
  },
  audioErrorBar: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  audioErrorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        maxWidth: 700,
        alignSelf: 'center' as const,
        width: '100%',
      },
    }),
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  soapContent: {
    maxHeight: 400,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    minWidth: 140,
  },
});
