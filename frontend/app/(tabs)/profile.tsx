import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, Surface, Divider, List, Portal, Dialog, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
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
  const { isDark, toggleTheme, colors } = useAppTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
            <Avatar.Text
              size={80}
              label={profile.full_name.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: colors.primary }}
            />
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
