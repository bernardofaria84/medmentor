import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { Text, Card, Avatar, Chip, ActivityIndicator, Searchbar, Divider, IconButton, Surface, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getMentors, getConversations } from '../../services/api';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getDoctorFirstName = () => {
    if (!user?.full_name) return '';
    const parts = user.full_name.replace(/^(Dr\.|Dra\.|Dr |Dra )/i, '').trim().split(' ');
    return parts[0] || '';
  };

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
    if (score >= 0.45) return 'Média';
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
          <Text variant="headlineLarge" style={[styles.headerGreeting, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            {getGreeting()}{getDoctorFirstName() ? `, Dr. ${getDoctorFirstName()}` : ''}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>
            O conhecimento do especialista, na palma da sua mão.
          </Text>
        </View>

        <Surface style={[styles.searchContainer, { backgroundColor: colors.surface }]} elevation={2}>
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
            style={[styles.searchBar, { backgroundColor: colors.surface }]}
            inputStyle={{ color: colors.text, fontFamily: 'Inter_400Regular' }}
            iconColor={colors.textSecondary}
            icon="magnify"
            loading={isSearching}
            right={() => searchQuery.length > 0 ? (
              <IconButton icon="close" size={20} onPress={clearSearch} iconColor={colors.textSecondary} />
            ) : null}
            data-testid="universal-search-bar"
            elevation={0}
          />
        </Surface>

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
          <Text style={[styles.searchHint, { color: colors.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Digite pelo menos 3 caracteres e pressione Enter
          </Text>
        )}

        {/* Search Results */}
        {searchResults !== null && (
          <View style={styles.searchResultsSection}>
            <View style={styles.searchResultsHeader}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
              <Text variant="titleMedium" style={[styles.searchResultsTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
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
                      labelStyle={{ fontFamily: 'Inter_700Bold' }}
                    />
                    <View style={styles.resultInfo}>
                      <Text variant="titleMedium" style={{ fontFamily: 'Inter_700Bold', color: colors.text }}>
                        {result.mentor_name}
                      </Text>
                      <Chip
                        mode="flat"
                        style={[styles.resultSpecialty, { backgroundColor: colors.primaryLight }]}
                        textStyle={{ fontSize: 11, color: colors.primary, fontFamily: 'Inter_700Bold' }}
                      >
                        {result.specialty}
                      </Chip>
                    </View>
                    <View style={styles.relevanceBadge}>
                      <Text style={[styles.relevanceScore, { color: getRelevanceColor(result.best_score), fontFamily: 'Inter_700Bold' }]}>
                        {Math.round(result.best_score * 100)}%
                      </Text>
                      <Text style={[styles.relevanceLabel, { color: getRelevanceColor(result.best_score), fontFamily: 'Inter_400Regular' }]}>
                        {getRelevanceLabel(result.best_score)}
                      </Text>
                    </View>
                  </View>

                  <Divider style={[styles.resultDivider, { backgroundColor: colors.border }]} />

                  {result.excerpts.map((excerpt, i) => (
                    <View key={i} style={styles.excerptItem}>
                      <MaterialCommunityIcons name="text-box-outline" size={14} color={colors.textTertiary} />
                      <View style={styles.excerptContent}>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary, lineHeight: 18, fontFamily: 'Inter_400Regular' }} numberOfLines={3}>
                          {excerpt.text}
                        </Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
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
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Limpar busca e voltar</Text>
            </Pressable>
          </View>
        )}

        {/* Normal Home Content */}
        {searchResults === null && (
          <>
            {recentConversations.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                  Conversas Recentes
                </Text>
                {recentConversations.map(conv => (
                  <Card
                    key={conv.id}
                    style={[styles.conversationCard, { backgroundColor: colors.card }]}
                    onPress={() => router.push(`/conversation/${conv.id}`)}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={{ fontFamily: 'Inter_700Bold', color: colors.text, marginBottom: 4 }}>
                        {conv.mentor_name}
                      </Text>
                      <Text variant="bodySmall" numberOfLines={2} style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>
                        {conv.last_message}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                Mentores Disponíveis
              </Text>
              {mentors.length === 0 ? (
                <EmptyState
                  icon="account-search-outline"
                  title="Nenhum mentor disponível"
                  description="Ainda não há mentores cadastrados na plataforma."
                />
              ) : (
                <View style={styles.mentorGrid}>
                  {mentors.map(mentor => (
                    <Card
                      key={mentor.id}
                      style={[styles.mentorCard, { backgroundColor: colors.card }]}
                      onPress={() => router.push(`/chat/${mentor.id}`)}
                      data-testid={`mentor-card-${mentor.id}`}
                    >
                      <Card.Content style={styles.mentorCardContent}>
                        {mentor.avatar_url ? (
                          <Image
                            source={{ uri: mentor.avatar_url }}
                            style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 4 }}
                          />
                        ) : (
                          <Avatar.Text
                            size={64}
                            label={mentor.full_name.substring(0, 2).toUpperCase()}
                            style={[styles.avatar, { backgroundColor: colors.primary }]}
                            labelStyle={{ fontFamily: 'Inter_700Bold' }}
                          />
                        )}
                        <Text
                          variant="titleSmall"
                          style={{ fontFamily: 'Inter_700Bold', color: colors.text, marginTop: 10, textAlign: 'center' }}
                          numberOfLines={2}
                        >
                          {mentor.full_name}
                        </Text>
                        <View style={[styles.specialtyTag, { backgroundColor: colors.primaryLight }]}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                            {mentor.specialty}
                          </Text>
                        </View>
                        <Pressable
                          style={[styles.consultBtn, { backgroundColor: colors.primary }]}
                          onPress={() => router.push(`/chat/${mentor.id}`)}
                          data-testid={`consult-btn-${mentor.id}`}
                        >
                          <Text style={styles.consultBtnText}>Consultar</Text>
                        </Pressable>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerGreeting: {
    marginBottom: 4,
  },
  searchContainer: {
    marginBottom: 8,
    borderRadius: 12,
  },
  searchBar: {
    borderRadius: 12,
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
  },
  relevanceLabel: {
    fontSize: 11,
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
    fontSize: 14,
    fontFamily: 'Inter_700Bold'
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
    marginBottom: 12,
  },
  conversationCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  mentorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mentorCard: {
    flex: 1,
    minWidth: 140,
    maxWidth: '48%',
    borderRadius: 16,
    elevation: 2,
  },
  mentorCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    marginBottom: 4,
  },
  specialtyTag: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: '100%',
  },
  consultBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  consultBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
