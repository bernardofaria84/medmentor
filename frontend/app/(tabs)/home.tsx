import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Avatar, Chip, ActivityIndicator, Searchbar, Divider, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getMentors, getConversations } from '../../services/api';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import EmptyState from '../../components/EmptyState';

interface Mentor {
  id: string;
  full_name: string;
  specialty: string;
  bio?: string;
  avatar_url?: string;
}

interface Conversation {
  id: string;
  mentor_id: string;
  mentor_name: string;
  title: string;
  last_message: string;
}

interface SearchResult {
  mentor_id: string;
  mentor_name: string;
  specialty: string;
  best_score: number;
  excerpts: { text: string; score: number; content_title: string }[];
}

export default function HomeScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mentorsData, conversationsData] = await Promise.all([
        getMentors(),
        getConversations().catch(() => [])
      ]);
      setMentors(mentorsData);
      setRecentConversations(conversationsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setSearchResults(null);
    setSearchQuery('');
    loadData();
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.get(`/api/search/universal?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.results);

      if (response.data.results.length === 0) {
        setSearchError('Nenhum resultado encontrado para sua busca.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError(error.response?.data?.detail || 'Erro ao buscar. Tente novamente.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.6) return colors.success;
    if (score >= 0.45) return colors.warning;
    return colors.textTertiary;
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.6) return 'Alta';
    if (score >= 0.45) return 'Media';
    return 'Baixa';
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.headerTitle, { color: colors.text }]}>
            Bem-vindo ao MedMentor
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
            Converse com especialistas renomados atraves de IA
          </Text>
        </View>

        <Searchbar
          placeholder="Pesquise em todas as bases de conhecimento..."
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.trim().length < 3) {
              setSearchResults(null);
              setSearchError(null);
            }
          }}
          onSubmitEditing={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.card }]}
          inputStyle={{ color: colors.text }}
          iconColor={colors.textSecondary}
          icon="magnify"
          loading={isSearching}
          right={() => searchQuery.length > 0 ? (
            <IconButton icon="close" size={20} onPress={clearSearch} iconColor={colors.textSecondary} />
          ) : null}
          data-testid="universal-search-bar"
        />

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
          <Text style={[styles.searchHint, { color: colors.textTertiary }]}>
            Digite pelo menos 3 caracteres e pressione Enter
          </Text>
        )}

        {/* Search Results */}
        {searchResults !== null && (
          <View style={styles.searchResultsSection}>
            <View style={styles.searchResultsHeader}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
              <Text variant="titleMedium" style={[styles.searchResultsTitle, { color: colors.text }]}>
                {searchResults.length > 0
                  ? `${searchResults.length} mentor(es) encontrado(s)`
                  : 'Sem resultados'}
              </Text>
            </View>

            {searchError && searchResults.length === 0 && (
              <EmptyState
                icon="file-search-outline"
                title="Sem resultados"
                description={searchError}
              />
            )}

            {searchResults.map((result) => (
              <Card
                key={result.mentor_id}
                style={[styles.searchResultCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/chat/${result.mentor_id}`)}
              >
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <Avatar.Text
                      size={44}
                      label={result.mentor_name.substring(0, 2).toUpperCase()}
                      style={{ backgroundColor: colors.primary }}
                    />
                    <View style={styles.resultInfo}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text }}>
                        {result.mentor_name}
                      </Text>
                      <Chip
                        mode="flat"
                        style={[styles.resultSpecialty, { backgroundColor: colors.primaryLight }]}
                        textStyle={{ fontSize: 11, color: colors.primary }}
                      >
                        {result.specialty}
                      </Chip>
                    </View>
                    <View style={styles.relevanceBadge}>
                      <Text style={[styles.relevanceScore, { color: getRelevanceColor(result.best_score) }]}>
                        {Math.round(result.best_score * 100)}%
                      </Text>
                      <Text style={[styles.relevanceLabel, { color: getRelevanceColor(result.best_score) }]}>
                        {getRelevanceLabel(result.best_score)}
                      </Text>
                    </View>
                  </View>

                  <Divider style={[styles.resultDivider, { backgroundColor: colors.border }]} />

                  {result.excerpts.map((excerpt, i) => (
                    <View key={i} style={styles.excerptItem}>
                      <MaterialCommunityIcons name="text-box-outline" size={14} color={colors.textTertiary} />
                      <View style={styles.excerptContent}>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary, lineHeight: 18 }} numberOfLines={3}>
                          {excerpt.text}
                        </Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4 }}>
                          Fonte: {excerpt.content_title}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <Pressable
                    style={[styles.chatButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/chat/${result.mentor_id}`)}
                  >
                    <MaterialCommunityIcons name="message-text" size={16} color="#ffffff" />
                    <Text style={styles.chatButtonText}>Conversar com {result.mentor_name.split(' ')[0]}</Text>
                  </Pressable>
                </Card.Content>
              </Card>
            ))}

            <Pressable onPress={clearSearch} style={styles.clearSearchBtn}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Limpar busca e voltar</Text>
            </Pressable>
          </View>
        )}

        {/* Normal Home Content */}
        {searchResults === null && (
          <>
            {recentConversations.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                  Conversas Recentes
                </Text>
                {recentConversations.map(conv => (
                  <Card
                    key={conv.id}
                    style={[styles.conversationCard, { backgroundColor: colors.card }]}
                    onPress={() => router.push(`/conversation/${conv.id}`)}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={{ fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                        {conv.mentor_name}
                      </Text>
                      <Text variant="bodySmall" numberOfLines={2} style={{ color: colors.textSecondary }}>
                        {conv.last_message}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                Mentores Disponiveis
              </Text>
              {mentors.length === 0 ? (
                <EmptyState
                  icon="account-search-outline"
                  title="Nenhum mentor disponivel"
                  description="Ainda nao ha mentores cadastrados na plataforma."
                />
              ) : (
                mentors.map(mentor => (
                  <Card
                    key={mentor.id}
                    style={[styles.mentorCard, { backgroundColor: colors.card }]}
                    onPress={() => router.push(`/chat/${mentor.id}`)}
                    data-testid={`mentor-card-${mentor.id}`}
                  >
                    <Card.Content style={styles.mentorCardContent}>
                      <Avatar.Text
                        size={56}
                        label={mentor.full_name.substring(0, 2).toUpperCase()}
                        style={[styles.avatar, { backgroundColor: colors.primary }]}
                      />
                      <View style={styles.mentorInfo}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                          {mentor.full_name}
                        </Text>
                        <Chip mode="flat" style={[styles.specialtyChip, { backgroundColor: colors.primaryLight }]}
                          textStyle={{ color: colors.primary }}>
                          {mentor.specialty}
                        </Chip>
                        {mentor.bio && (
                          <Text variant="bodySmall" numberOfLines={2} style={{ color: colors.textSecondary, marginTop: 4 }}>
                            {mentor.bio}
                          </Text>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchBar: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  searchHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  searchResultsSection: {
    marginTop: 8,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  searchResultsTitle: {
    fontWeight: 'bold',
  },
  searchResultCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultSpecialty: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 24,
  },
  relevanceBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  relevanceScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  relevanceLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultDivider: {
    marginVertical: 12,
  },
  excerptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  excerptContent: {
    flex: 1,
    marginLeft: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  chatButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  clearSearchBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  conversationCard: {
    marginBottom: 8,
  },
  mentorCard: {
    marginBottom: 12,
  },
  mentorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  mentorInfo: {
    flex: 1,
  },
  specialtyChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
});
