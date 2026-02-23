import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getConversations } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import EmptyState from '../../components/EmptyState';

interface Conversation {
  id: string;
  mentor_id: string;
  mentor_name: string;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [mentorFilter, setMentorFilter] = useState<string | null>(null);
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const mentorNames = useMemo(() => {
    const names = new Set(conversations.map(c => c.mentor_name));
    return Array.from(names);
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(conv =>
        conv.title.toLowerCase().includes(q) ||
        conv.mentor_name.toLowerCase().includes(q) ||
        conv.last_message?.toLowerCase().includes(q)
      );
    }

    if (mentorFilter) {
      result = result.filter(c => c.mentor_name === mentorFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(conv => {
        const convDate = new Date(conv.updated_at);
        const diffMs = now.getTime() - convDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today') return diffDays < 1;
        if (dateFilter === 'week') return diffDays < 7;
        if (dateFilter === 'month') return diffDays < 30;
        return true;
      });
    }

    return result;
  }, [conversations, searchQuery, dateFilter, mentorFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atras`;
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Fixed header: search + filters */}
      <View style={styles.headerSection}>
        <Searchbar
          placeholder="Buscar conversas..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.card }]}
          inputStyle={{ color: colors.text }}
          iconColor={colors.textSecondary}
          data-testid="history-search-bar"
        />

        {/* Date Filters */}
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: 'Todas' },
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mes' },
          ] as { key: DateFilter; label: string }[]).map(f => (
            <Chip
              key={f.key}
              selected={dateFilter === f.key}
              onPress={() => setDateFilter(f.key)}
              style={[
                styles.filterChip,
                dateFilter === f.key
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceVariant },
              ]}
              textStyle={{
                color: dateFilter === f.key ? '#ffffff' : colors.textSecondary,
                fontSize: 13,
              }}
              data-testid={`filter-date-${f.key}`}
            >
              {f.label}
            </Chip>
          ))}
        </View>

        {/* Mentor Filters */}
        {mentorNames.length > 1 && (
          <View style={styles.filterRow}>
            <Chip
              selected={!mentorFilter}
              onPress={() => setMentorFilter(null)}
              style={[
                styles.filterChip,
                !mentorFilter
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceVariant },
              ]}
              textStyle={{ color: !mentorFilter ? '#ffffff' : colors.textSecondary, fontSize: 13 }}
            >
              Todos Mentores
            </Chip>
            {mentorNames.map(name => (
              <Chip
                key={name}
                selected={mentorFilter === name}
                onPress={() => setMentorFilter(mentorFilter === name ? null : name)}
                style={[
                  styles.filterChip,
                  mentorFilter === name
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                textStyle={{ color: mentorFilter === name ? '#ffffff' : colors.textSecondary, fontSize: 13 }}
                data-testid={`filter-mentor-${name}`}
              >
                {name}
              </Chip>
            ))}
          </View>
        )}
      </View>

      {/* Scrollable conversation list */}
      <View style={styles.listSection}>
        {filteredConversations.length === 0 ? (
          conversations.length === 0 ? (
            <EmptyState
              icon="chat-outline"
              title="Nenhuma conversa ainda"
              description="Comece conversando com um mentor na tela inicial"
              actionLabel="Ir para Inicio"
              onAction={() => router.push('/(tabs)/home')}
            />
          ) : (
            <EmptyState
              icon="filter-off-outline"
              title="Sem resultados"
              description="Nenhuma conversa encontrada com os filtros atuais. Tente ajustar sua busca."
            />
          )
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text variant="bodySmall" style={[styles.resultCount, { color: colors.textTertiary }]}>
              {filteredConversations.length} conversa(s)
            </Text>
            {filteredConversations.map(conv => (
              <Card
                key={conv.id}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/conversation/${conv.id}`)}
                data-testid={`conversation-card-${conv.id}`}
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Chip
                      mode="flat"
                      style={[styles.mentorChip, { backgroundColor: colors.primaryLight }]}
                      textStyle={{ color: colors.primary, fontSize: 12 }}
                    >
                      {conv.mentor_name}
                    </Chip>
                    <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                      {formatDate(conv.updated_at)}
                    </Text>
                  </View>
                  <Text variant="titleSmall" style={[styles.title, { color: colors.text }]}>
                    {conv.title}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={2} style={{ color: colors.textSecondary }}>
                    {conv.last_message}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    flexShrink: 0,
    paddingBottom: 4,
  },
  listSection: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 40,
  },
  filterRowContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  filterChip: {
    marginRight: 8,
    height: 34,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  resultCount: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mentorChip: {
    height: 28,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
});
