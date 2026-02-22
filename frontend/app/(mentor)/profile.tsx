import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, TextInput, Button, ActivityIndicator, Avatar, Portal, Dialog, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  bio?: string;
  avatar_url?: string;
}

export default function MentorProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' });
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const showSnackbar = (message: string, type: string = 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/mentors/profile/me');
      setProfile(response.data);
      setFullName(response.data.full_name);
      setSpecialty(response.data.specialty);
      setBio(response.data.bio || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      showSnackbar('Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName || !specialty) {
      showSnackbar('Por favor, preencha todos os campos obrigatórios', 'error');
      return;
    }

    setSaving(true);

    try {
      await api.put('/api/mentors/profile', {
        full_name: fullName,
        specialty,
        bio: bio || undefined,
      });

      showSnackbar('Perfil atualizado com sucesso!', 'success');
      loadProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showSnackbar(error.response?.data?.detail || 'Erro ao atualizar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      router.replace('/(mentor)/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.avatarCard}>
          <Card.Content style={styles.avatarContent}>
            <Avatar.Text
              size={100}
              label={profile.full_name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name}>
              {profile.full_name}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {profile.email}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Informações do Perfil
            </Text>

            <TextInput
              label="Nome Completo *"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              disabled={saving}
            />

            <TextInput
              label="Especialidade *"
              value={specialty}
              onChangeText={setSpecialty}
              mode="outlined"
              style={styles.input}
              disabled={saving}
            />

            <TextInput
              label="Biografia"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
              disabled={saving}
              placeholder="Conte aos médicos assinantes sobre sua experiência e expertise..."
            />

            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setFullName(profile.full_name);
                  setSpecialty(profile.specialty);
                  setBio(profile.bio || '');
                }}
                disabled={saving}
                style={styles.button}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.button}
              >
                Salvar Alterações
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.dangerCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.dangerTitle}>
              Zona de Perigo
            </Text>
            <Text variant="bodySmall" style={styles.dangerText}>
              Ao sair, você precisará fazer login novamente para acessar sua conta.
            </Text>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#ef4444"
              icon="logout"
            >
              Sair da Conta
            </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  avatarCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  avatarContent: {
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
  formCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  dangerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerTitle: {
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  dangerText: {
    color: '#64748b',
    marginBottom: 16,
  },
  logoutButton: {
    borderColor: '#ef4444',
  },
});
