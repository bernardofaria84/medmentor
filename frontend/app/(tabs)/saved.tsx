import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useAppTheme } from '../../contexts/ThemeContext';
import EmptyState from '../../components/EmptyState';
import Markdown from 'react-native-markdown-display';

export default function SavedScreen() {
  const { bookmarks, removeBookmark, loadBookmarks } = useBookmarks();
  const router = useRouter();
  const { colors } = useAppTheme();

  // Reload bookmarks every time screen is focused
  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sorted = [...bookmarks].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {sorted.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Nenhum item salvo"
          description="Toque no ícone de favorito em qualquer resposta do mentor para salvá-la aqui."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="bodySmall" style={[styles.count, { color: colors.textTertiary }]}>
            {sorted.length} resposta(s) salva(s)
          </Text>
          {sorted.map(bookmark => (
            <Card
              key={bookmark.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              data-testid={`saved-card-${bookmark.id}`}
            >
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Chip
                    mode="flat"
                    style={[styles.mentorChip, { backgroundColor: colors.primaryLight }]}
                    textStyle={{ color: colors.primary, fontSize: 12 }}
                    icon="account-tie"
                  >
                    {bookmark.mentorName || 'Mentor'}
                  </Chip>
                  <View style={styles.cardHeaderRight}>
                    <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                      {formatDate(bookmark.savedAt)}
                    </Text>
                    <IconButton
                      icon="bookmark-remove-outline"
                      size={18}
                      iconColor={colors.error}
                      onPress={() => removeBookmark(bookmark.messageId)}
                      data-testid={`remove-bookmark-${bookmark.messageId}`}
                    />
                  </View>
                </View>

                <View style={[styles.contentBox, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceVariant }]}>
                  <Markdown style={{ body: { color: colors.text, fontSize: 14, lineHeight: 22 } }}>
                    {bookmark.content.length > 400
                      ? bookmark.content.slice(0, 400) + '…'
                      : bookmark.content}
                  </Markdown>
                </View>

                {bookmark.conversationId && (
                  <Pressable
                    onPress={() => router.push(`/conversation/${bookmark.conversationId}`)}
                    style={styles.viewConvLink}
                    data-testid={`view-conv-${bookmark.conversationId}`}
                  >
                    <MaterialCommunityIcons name="open-in-app" size={14} color={colors.primary} />
                    <Text style={[styles.viewConvText, { color: colors.primary }]}>
                      Ver conversa completa
                    </Text>
                  </Pressable>
                )}
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  count: { marginBottom: 12, paddingLeft: 4 },
  card: { marginBottom: 16, borderRadius: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorChip: { height: 28 },
  contentBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  viewConvLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  viewConvText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
