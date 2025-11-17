import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Text, TextInput, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import { sendChatMessage, getConversationMessages, getConversations } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';

interface Message {
  id: string;
  sender_type: 'USER' | 'MENTOR_BOT';
  content: string;
  citations: any[];
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mentorId, setMentorId] = useState('');
  const [mentorName, setMentorName] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      // Get conversation details
      const conversations = await getConversations();
      const conv = conversations.find((c: any) => c.id === conversationId);
      
      if (conv) {
        setMentorId(conv.mentor_id);
        setMentorName(conv.mentor_name);
      }

      // Get messages
      const messagesData = await getConversationMessages(conversationId as string);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender_type: 'USER',
      content: inputText.trim(),
      citations: [],
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);
    Keyboard.dismiss();

    try {
      const response = await sendChatMessage(
        mentorId,
        userMessage.content,
        conversationId as string
      );

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
      setSending(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: mentorName || 'Conversa',
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

            {sending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Dr. {mentorName} está analisando...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              placeholder="Digite sua pergunta..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              style={styles.input}
              disabled={sending}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSend}
                  disabled={!inputText.trim() || sending}
                  color={inputText.trim() && !sending ? '#2563eb' : '#cbd5e1'}
                />
              }
            />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
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
