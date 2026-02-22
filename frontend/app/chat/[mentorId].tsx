import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, IconButton, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { sendChatMessage, getMentors } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAppTheme } from '../../contexts/ThemeContext';
import EmptyState from '../../components/EmptyState';

interface Message {
  id: string;
  sender_type: 'USER' | 'MENTOR_BOT';
  content: string;
  citations: any[];
}

export default function ChatScreen() {
  const { mentorId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [mentorName, setMentorName] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { colors } = useAppTheme();

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
    loadMentorInfo();
  }, [mentorId]);

  const loadMentorInfo = async () => {
    try {
      const mentors = await getMentors();
      const mentor = mentors.find((m: any) => m.id === mentorId);
      if (mentor) {
        setMentorName(mentor.full_name);
      }
    } catch (error) {
      console.error('Error loading mentor:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender_type: 'USER',
      content: inputText.trim(),
      citations: [],
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const response = await sendChatMessage(
        mentorId as string,
        userMessage.content,
        conversationId
      );

      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      const botMessage: Message = {
        id: response.message_id,
        sender_type: 'MENTOR_BOT',
        content: response.response,
        citations: response.citations || [],
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender_type: 'MENTOR_BOT',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        citations: [],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <>
      <Stack.Screen
        options={{
          title: mentorName || 'Chat',
          headerShown: true,
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          headerBackTitle: 'Voltar',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <EmptyState
                icon="message-text-outline"
                title="Faca sua primeira pergunta"
                description={`O Dr. ${mentorName} esta pronto para ajuda-lo com base em seu conhecimento especializado.`}
              />
            )}

            {messages.map(message => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.sender_type === 'USER'
                    ? styles.userMessageContainer
                    : styles.botMessageContainer,
                ]}
              >
                <Card
                  style={[
                    styles.messageCard,
                    message.sender_type === 'USER'
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.card },
                  ]}
                >
                  <Card.Content>
                    {message.sender_type === 'USER' ? (
                      <Text style={styles.messageText}>{message.content}</Text>
                    ) : (
                      <Markdown style={{ body: { color: colors.text } }}>{message.content}</Markdown>
                    )}
                    {message.citations && message.citations.length > 0 && (
                      <View style={[styles.citationsContainer, { borderTopColor: colors.border }]}>
                        <Text variant="labelSmall" style={{ marginBottom: 8, color: colors.textTertiary }}>
                          Fontes:
                        </Text>
                        {message.citations.map((citation, idx) => (
                          <Chip key={idx} mode="outlined" style={[styles.citationChip, { borderColor: colors.border }]}
                            textStyle={{ color: colors.textSecondary }}>
                            {citation.title}
                          </Chip>
                        ))}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              </View>
            ))}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Dr. {mentorName} esta analisando...
                </Text>
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
                disabled={loading || isTranscribing}
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                data-testid="chat-mic-btn"
              />
              <TextInput
                mode="outlined"
                placeholder="Digite ou grave sua pergunta..."
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                style={[styles.input, { backgroundColor: colors.card }]}
                disabled={loading || isRecording}
                textColor={colors.text}
                right={
                  <TextInput.Icon
                    icon="send"
                    onPress={handleSend}
                    disabled={!inputText.trim() || loading}
                    color={inputText.trim() && !loading ? colors.primary : colors.textTertiary}
                  />
                }
                data-testid="chat-input"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '85%',
  },
  messageText: {
    color: '#ffffff',
  },
  citationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  citationChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 12,
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
    maxHeight: 120,
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
});
