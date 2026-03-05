import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Image, Pressable, Alert } from 'react-native';
import { Text, Button, Avatar, Surface, Divider, List, Portal, Dialog, Switch, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { getUserProfile, updateUserProfile } from '../../services/api';
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
  const { isDark, toggleTheme, colors } = useAppTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      if (data.profile_picture_url) setLocalAvatar(data.profile_picture_url);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Compress by loading into a canvas at max 300x300
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          const img = new window.Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const max = 300;
            const ratio = Math.min(max / img.width, max / img.height, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            try {
              setUploadingAvatar(true);
              await updateUserProfile({ profile_picture_url: compressed });
              setLocalAvatar(compressed);
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível salvar a foto. Tente novamente.');
            } finally {
              setUploadingAvatar(false);
            }
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert('Em breve', 'Upload de foto disponível em breve no app nativo.');
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
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={[styles.profileCard, { backgroundColor: colors.card }]} elevation={1}>
          <View style={styles.avatarContainer}>
            <Pressable onPress={handlePickImage} style={styles.avatarWrapper} data-testid="avatar-upload-btn">
              {localAvatar ? (
                <Image source={{ uri: localAvatar }} style={styles.avatarImage} />
              ) : (
                <Avatar.Text
                  size={80}
                  label={profile.full_name.substring(0, 2).toUpperCase()}
                  style={{ backgroundColor: colors.primary }}
                />
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                {uploadingAvatar
                  ? <ActivityIndicator size={10} color="#fff" />
                  : <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                }
              </View>
            </Pressable>
            <Text variant="headlineSmall" style={[styles.name, { color: colors.text }]}>
              {profile.full_name}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              {profile.email}
            </Text>
          </View>

          <Divider style={{ marginHorizontal: 16, backgroundColor: colors.border }} />

          <View style={styles.infoSection}>
            <List.Item
              title="CRM"
              description={profile.crm}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={props => <List.Icon {...props} icon="card-account-details" color={colors.primary} />}
            />
            {profile.specialty && (
              <List.Item
                title="Especialidade"
                description={profile.specialty}
                titleStyle={{ color: colors.text }}
                descriptionStyle={{ color: colors.textSecondary }}
                left={props => <List.Icon {...props} icon="stethoscope" color={colors.primary} />}
              />
            )}
          </View>
        </Surface>

        <Surface style={[styles.menuCard, { backgroundColor: colors.card }]} elevation={1}>
          <List.Item
            title="Modo Escuro"
            titleStyle={{ color: colors.text }}
            left={props => <List.Icon {...props} icon={isDark ? 'weather-night' : 'white-balance-sunny'} color={colors.primary} />}
            right={() => (
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                color={colors.primary}
                testID="dark-mode-toggle"
              />
            )}
            data-testid="dark-mode-item"
          />
          <Divider style={{ backgroundColor: colors.border }} />
          <List.Item
            title="Sobre o MedMentor"
            titleStyle={{ color: colors.text }}
            left={props => <List.Icon {...props} icon="information" color={colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={colors.textTertiary} />}
            onPress={() => router.push('/(tabs)/about')}
            data-testid="about-link"
          />
          <Divider style={{ backgroundColor: colors.border }} />
          <List.Item
            title="Termos de Uso"
            titleStyle={{ color: colors.text }}
            left={props => <List.Icon {...props} icon="file-document" color={colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={colors.textTertiary} />}
            onPress={() => router.push('/(tabs)/about')}
            data-testid="terms-link"
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.error }]}
          icon="logout"
          textColor={colors.error}
          data-testid="logout-btn"
        >
          Sair
        </Button>

        <Text variant="bodySmall" style={[styles.versionText, { color: colors.textTertiary }]}>
          MedMentor v2.0.0
        </Text>
      </ScrollView>

      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Icon icon="logout" />
          <Dialog.Title style={styles.dialogTitle}>Sair</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Tem certeza que deseja sair da sua conta?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)} disabled={loggingOut}>
              Cancelar
            </Button>
            <Button
              onPress={confirmLogout}
              textColor={colors.error}
              loading={loggingOut}
              disabled={loggingOut}
            >
              Sair
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 24,
  },
  avatarWrapper: {
    position: 'relative',
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 0,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  infoSection: {
    paddingVertical: 8,
  },
  menuCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
  },
  dialogTitle: {
    textAlign: 'center',
  },
});
