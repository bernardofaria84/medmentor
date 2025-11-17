import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// API Functions
export const getMentors = async () => {
  const response = await api.get('/api/mentors');
  return response.data;
};

export const sendChatMessage = async (mentorId: string, question: string, conversationId?: string) => {
  const response = await api.post('/api/chat', {
    mentor_id: mentorId,
    question,
    conversation_id: conversationId
  });
  return response.data;
};

export const getConversations = async () => {
  const response = await api.get('/api/conversations');
  return response.data;
};

export const getConversationMessages = async (conversationId: string) => {
  const response = await api.get(`/api/conversations/${conversationId}/messages`);
  return response.data;
};

export const updateMessageFeedback = async (messageId: string, feedback: 'LIKE' | 'DISLIKE' | 'NONE') => {
  const response = await api.post(`/api/messages/${messageId}/feedback`, null, {
    params: { feedback }
  });
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/api/users/profile');
  return response.data;
};

export const updateUserProfile = async (data: any) => {
  const response = await api.put('/api/users/profile', data);
  return response.data;
};
