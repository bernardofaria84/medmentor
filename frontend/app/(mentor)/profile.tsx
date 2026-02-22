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
  agent_profile?: string;
  agent_profile_pending?: string;
  profile_status?: string;
}

export default function MentorProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
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

  const handleApproveProfile = async () => {
    setApproving(true);
    try {
      await api.post('/api/mentors/profile/approve');
      showSnackbar('Perfil do bot aprovado e ativado com sucesso!', 'success');
      loadProfile(); // Reload to get updated status
    } catch (error: any) {
      console.error('Error approving profile:', error);
      showSnackbar(error.response?.data?.detail || 'Erro ao aprovar perfil', 'error');
    } finally {
      setApproving(false);
    }
  };

  const renderBotStatusCard = () => {
    const status = profile?.profile_status || 'INACTIVE';
    
    if (status === 'ACTIVE') {
      return (
        <Card style={[styles.botStatusCard, styles.botStatusActive]}>
          <Card.Content>
            <View style={styles.botStatusHeader}>
              <Text style={styles.botStatusIcon}>✅</Text>
              <Text variant="titleMedium" style={styles.botStatusTitle}>
                Bot de IA Ativo
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.botStatusText}>
              Seu bot de IA está ativo e operando com o perfil abaixo.
            </Text>
            
            {profile?.agent_profile && (
              <View style={styles.activeProfileBox}>
                <Text variant="labelLarge" style={styles.activeProfileLabel}>
                  Perfil em Uso:
                </Text>
                <Text variant="bodySmall" style={styles.activeProfileText}>
                  {profile.agent_profile}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      );
    }
    
    if (status === 'INACTIVE') {
      return (
        <Card style={[styles.botStatusCard, styles.botStatusInactive]}>
          <Card.Content>
            <View style={styles.botStatusHeader}>
              <Text style={styles.botStatusIcon}>⚠️</Text>
              <Text variant="titleMedium" style={styles.botStatusTitleWarn}>
                Bot de IA Inativo
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.botStatusText}>
              Seu bot de IA está inativo. Faça o upload de conteúdo para gerar e ativar seu perfil de IA.
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/(mentor)/content')}
              style={styles.uploadButton}
              icon="upload"
            >
              Ir para Upload de Conteúdo
            </Button>
          </Card.Content>
        </Card>
      );
    }
    
    // PENDING_APPROVAL
    return (
      <Card style={[styles.botStatusCard, styles.botStatusPending]}>
        <Card.Content>
          <View style={styles.botStatusHeader}>
            <Text style={styles.botStatusIcon}>🔍</Text>
            <Text variant="titleMedium" style={styles.botStatusTitlePending}>
              Aprovação de Perfil Pendente
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.botStatusText}>
            Um novo perfil de personalidade foi gerado para seu bot de IA. Revise o perfil abaixo e aprove para ativá-lo.
          </Text>
          
          {profile?.agent_profile_pending && (
            <View style={styles.pendingProfileBox}>
              <Text variant="labelLarge" style={styles.pendingProfileLabel}>
                Perfil Gerado pela IA:
              </Text>
              <Text variant="bodySmall" style={styles.pendingProfileText}>
                {profile.agent_profile_pending}
              </Text>
            </View>
          )}
          
          <Button
            mode="contained"
            onPress={handleApproveProfile}
            loading={approving}
            disabled={approving}
            style={styles.approveButton}
            icon="check-circle"
          >
            Aprovar e Ativar Perfil
          </Button>
        </Card.Content>
      </Card>
    );
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

        {/* Bot AI Status Card */}
        {renderBotStatusCard()}

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

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Icon icon="logout" />
          <Dialog.Title style={styles.dialogTitle}>Sair da Conta</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)} disabled={loggingOut}>
              Cancelar
            </Button>
            <Button 
              onPress={confirmLogout} 
              textColor="#ef4444"
              loading={loggingOut}
              disabled={loggingOut}
            >
              Sair
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar for feedback messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbar({ ...snackbar, visible: false }),
        }}
      >
        {snackbar.message}
      </Snackbar>
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
  dialogTitle: {
    textAlign: 'center',
  },
  // Bot Status Card styles
  botStatusCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  botStatusActive: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  botStatusInactive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  botStatusPending: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  botStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  botStatusIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  botStatusTitle: {
    color: '#166534',
    fontWeight: '700',
  },
  botStatusTitleWarn: {
    color: '#92400e',
    fontWeight: '700',
  },
  botStatusTitlePending: {
    color: '#1e40af',
    fontWeight: '700',
  },
  botStatusText: {
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  pendingProfileBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  pendingProfileLabel: {
    color: '#1e40af',
    marginBottom: 8,
  },
  pendingProfileText: {
    color: '#374151',
    lineHeight: 18,
  },
  approveButton: {
    backgroundColor: '#22c55e',
    marginTop: 4,
  },
  uploadButton: {
    marginTop: 4,
  },
});
