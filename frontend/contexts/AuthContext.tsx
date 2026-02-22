import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  email: string;
  full_name: string;
  user_type: 'user' | 'mentor';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user_type: string }>;
  signup: (email: string, password: string, fullName: string, crm: string, specialty?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ user_type: string }> => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      const { access_token, user_id, user_type } = response.data;
      
      console.log('✅ Login successful:', { user_id, user_type, email });
      
      setToken(access_token);
      const userData: User = {
        id: user_id,
        email,
        full_name: '',
        user_type
      };
      setUser(userData);

      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      console.log('✅ User data saved to storage:', userData);

      // Fetch full profile in background (don't block login)
      fetchProfile(access_token, user_type).catch(err => 
        console.error('Background profile fetch error:', err)
      );

      return { user_type };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, fullName: string, crm: string, specialty?: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup/user`, {
        email,
        password,
        full_name: fullName,
        crm,
        specialty
      });

      const { access_token, user_id, user_type } = response.data;
      
      setToken(access_token);
      const userData: User = {
        id: user_id,
        email,
        full_name: fullName,
        user_type
      };
      setUser(userData);

      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      console.error('Signup error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  };

  const fetchProfile = async (authToken: string, userType: string) => {
    try {
      const endpoint = userType === 'user' ? '/api/users/profile' : '/api/mentors/profile/me';
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const profileData = response.data;
      const userData: User = {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        user_type: userType as 'user' | 'mentor'
      };
      
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
