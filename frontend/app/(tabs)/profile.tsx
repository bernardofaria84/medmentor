import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Avatar, Surface, Divider, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  crm: string;
  specialty?: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.profileCard} elevation={1}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={80}
              label={profile.full_name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name}>
              {profile.full_name}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {profile.email}
            </Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoSection}>
            <List.Item
              title="CRM"
              description={profile.crm}
              left={props => <List.Icon {...props} icon="card-account-details" />}
            />
            {profile.specialty && (
              <List.Item
                title="Especialidade"
                description={profile.specialty}
                left={props => <List.Icon {...props} icon="stethoscope" />}
              />
            )}
          </View>
        </Surface>

        <Surface style={styles.menuCard} elevation={1}>
          <List.Item
            title="Sobre o MedMentor"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Ajuda e Suporte"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Termos de Uso"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
          textColor="#ef4444"
        >
          Sair
        </Button>

        <Text variant="bodySmall" style={styles.versionText}>
          MedMentor v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    backgroundColor: '#2563eb',
    marginBottom: 16,
  },
  name: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    color: '#64748b',
  },
  divider: {
    marginHorizontal: 16,
  },
  infoSection: {
    paddingVertical: 8,
  },
  menuCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#94a3b8',
  },
});
