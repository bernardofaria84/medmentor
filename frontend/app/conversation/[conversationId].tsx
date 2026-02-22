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

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
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
      Alert.alert('Erro', error.message || 'Não foi possível enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  // Generate SOAP Summary
  const generateSOAPSummary = async () => {
    if (messages.length < 2) {
      Alert.alert(
        'Conversa muito curta',
        'São necessárias pelo menos 2 mensagens para gerar um resumo SOAP.'
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
        error.response?.data?.detail || 'Não foi possível gerar o resumo SOAP'
      );
    } finally {
      setLoadingSOAP(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(soapSummary);
    Alert.alert('Copiado!', 'Resumo SOAP copiado para a área de transferência');
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
            isUser ? styles.userCard : styles.botCard,
          ]}
        >
          <Card.Content>
            <Markdown>{message.content}</Markdown>
            {message.citations && message.citations.length > 0 && (
              <View style={styles.citationsContainer}>
                <Text style={styles.citationsTitle}>Fontes:</Text>
                {message.citations.map((citation: any, index: number) => (
                  <Chip
                    key={index}
                    style={styles.citationChip}
                    textStyle={styles.citationText}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Conversa',
          headerRight: () => (
            <IconButton
              icon="briefcase-edit-outline"
              onPress={generateSOAPSummary}
              disabled={loadingSOAP}
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
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Enviando...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          {/* Recording indicator */}
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
          
          {/* Transcribing indicator */}
          {isTranscribing && (
            <View style={styles.transcribingBar}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.transcribingText}>Transcrevendo áudio...</Text>
            </View>
          )}

          {/* Audio error */}
          {audioError && !isRecording && !isTranscribing && (
            <View style={styles.audioErrorBar}>
              <Text style={styles.audioErrorText}>{audioError}</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <IconButton
              icon={isRecording ? "stop-circle" : "microphone"}
              iconColor={isRecording ? "#ef4444" : "#2563eb"}
              size={24}
              onPress={handleMicPress}
              disabled={sending || isTranscribing}
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
            />
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite ou grave sua pergunta..."
              multiline
              onSubmitEditing={handleSend}
              disabled={sending || isRecording}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSend}
                  disabled={sending || !inputText.trim()}
                />
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* SOAP Summary Modal */}
      <Portal>
        <Modal
          visible={showSOAPModal}
          onDismiss={() => setShowSOAPModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                📋 Resumo SOAP
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowSOAPModal(false)}
              />
            </View>

            <ScrollView style={styles.soapContent}>
              <Markdown>{soapSummary}</Markdown>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="contained"
                icon="content-copy"
                onPress={copyToClipboard}
                style={styles.copyButton}
              >
                Copiar para Prontuário
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  userCard: {
    backgroundColor: '#2196F3',
  },
  botCard: {
    backgroundColor: '#ffffff',
  },
  citationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  citationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  citationChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  citationText: {
    fontSize: 10,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  transcribingText: {
    marginLeft: 10,
    color: '#2563eb',
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
    color: '#666',
  },
  // SOAP Modal styles
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        maxWidth: 700,
        alignSelf: 'center',
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
    color: '#1e293b',
  },
  soapContent: {
    maxHeight: 400,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  copyButton: {
    minWidth: 200,
  },
});