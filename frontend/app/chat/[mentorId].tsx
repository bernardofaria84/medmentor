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
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Voltar',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
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
              <View style={styles.emptyState}>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  Faça sua primeira pergunta
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  O Dr. {mentorName} está pronto para ajudá-lo com base em seu conhecimento especializado.
                </Text>
              </View>
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
                    message.sender_type === 'USER' ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Card.Content>
                    {message.sender_type === 'USER' ? (
                      <Text style={styles.messageText}>{message.content}</Text>
                    ) : (
                      <Markdown style={markdownStyles}>{message.content}</Markdown>
                    )}
                    {message.citations && message.citations.length > 0 && (
                      <View style={styles.citationsContainer}>
                        <Text variant="labelSmall" style={styles.citationsLabel}>
                          Fontes:
                        </Text>
                        {message.citations.map((citation, idx) => (
                          <Chip key={idx} mode="outlined" style={styles.citationChip}>
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
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Dr. {mentorName} está analisando...</Text>
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
                disabled={loading || isTranscribing}
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
              />
              <TextInput
                mode="outlined"
                placeholder="Digite ou grave sua pergunta..."
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                style={styles.input}
                disabled={loading || isRecording}
                right={
                  <TextInput.Icon
                    icon="send"
                    onPress={handleSend}
                    disabled={!inputText.trim() || loading}
                    color={inputText.trim() && !loading ? '#2563eb' : '#cbd5e1'}
                  />
                }
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
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
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
  userMessage: {
    backgroundColor: '#2563eb',
  },
  botMessage: {
    backgroundColor: '#ffffff',
  },
  messageText: {
    color: '#ffffff',
  },
  citationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  citationsLabel: {
    marginBottom: 8,
    color: '#64748b',
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
    color: '#64748b',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    backgroundColor: '#ffffff',
    maxHeight: 120,
  },
});

const markdownStyles = {
  body: {
    color: '#1e293b',
  },
  heading1: {
    color: '#1e293b',
    fontWeight: 'bold',
  },
  heading2: {
    color: '#1e293b',
    fontWeight: 'bold',
  },
  strong: {
    fontWeight: 'bold',
  },
  link: {
    color: '#2563eb',
  },
};
