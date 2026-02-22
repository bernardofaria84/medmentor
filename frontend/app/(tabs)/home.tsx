import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Avatar, Chip, ActivityIndicator, Searchbar, Divider, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getMentors, getConversations } from '../../services/api';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    if (score >= 0.6) return '#22c55e';
    if (score >= 0.45) return '#f59e0b';
    return '#94a3b8';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.6) return 'Alta';
    if (score >= 0.45) return 'Média';
    return 'Baixa';
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mentor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Bem-vindo ao MedMentor
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Converse com especialistas renomados através de IA
          </Text>
        </View>

        {/* === Universal Semantic Search === */}
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
          style={styles.searchBar}
          icon="magnify"
          loading={isSearching}
          right={() => searchQuery.length > 0 ? (
            <IconButton icon="close" size={20} onPress={clearSearch} />
          ) : null}
        />

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
          <Text style={styles.searchHint}>Digite pelo menos 3 caracteres e pressione Enter</Text>
        )}

        {/* === Search Results === */}
        {searchResults !== null && (
          <View style={styles.searchResultsSection}>
            <View style={styles.searchResultsHeader}>
              <MaterialCommunityIcons name="magnify" size={20} color="#2563eb" />
              <Text variant="titleMedium" style={styles.searchResultsTitle}>
                {searchResults.length > 0 
                  ? `${searchResults.length} mentor(es) encontrado(s)` 
                  : 'Sem resultados'}
              </Text>
            </View>

            {searchError && searchResults.length === 0 && (
              <Card style={styles.noResultsCard}>
                <Card.Content style={styles.noResultsContent}>
                  <MaterialCommunityIcons name="file-search-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.noResultsText}>{searchError}</Text>
                  <Text style={styles.noResultsHint}>
                    Tente usar termos diferentes ou mais específicos
                  </Text>
                </Card.Content>
              </Card>
            )}

            {searchResults.map((result, index) => (
              <Card
                key={result.mentor_id}
                style={styles.searchResultCard}
                onPress={() => router.push(`/chat/${result.mentor_id}`)}
              >
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <Avatar.Text
                      size={44}
                      label={result.mentor_name.substring(0, 2).toUpperCase()}
                      style={styles.resultAvatar}
                    />
                    <View style={styles.resultInfo}>
                      <Text variant="titleMedium" style={styles.resultName}>
                        {result.mentor_name}
                      </Text>
                      <Chip 
                        mode="flat" 
                        style={styles.resultSpecialty}
                        textStyle={{ fontSize: 11 }}
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

                  <Divider style={styles.resultDivider} />

                  {result.excerpts.map((excerpt, i) => (
                    <View key={i} style={styles.excerptItem}>
                      <MaterialCommunityIcons name="text-box-outline" size={14} color="#94a3b8" />
                      <View style={styles.excerptContent}>
                        <Text variant="bodySmall" style={styles.excerptText} numberOfLines={3}>
                          {excerpt.text}
                        </Text>
                        <Text style={styles.excerptSource}>
                          Fonte: {excerpt.content_title} • Relevância: {Math.round(excerpt.score * 100)}%
                        </Text>
                      </View>
                    </View>
                  ))}

                  <Pressable
                    style={styles.chatButton}
                    onPress={() => router.push(`/chat/${result.mentor_id}`)}
                  >
                    <MaterialCommunityIcons name="message-text" size={16} color="#ffffff" />
                    <Text style={styles.chatButtonText}>Conversar com {result.mentor_name.split(' ')[0]}</Text>
                  </Pressable>
                </Card.Content>
              </Card>
            ))}

            <Pressable onPress={clearSearch} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>Limpar busca e voltar</Text>
            </Pressable>
          </View>
        )}

        {/* === Normal Home Content (hidden during search) === */}
        {searchResults === null && (
          <>
            {recentConversations.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Conversas Recentes
                </Text>
                {recentConversations.map(conv => (
                  <Card
                    key={conv.id}
                    style={styles.conversationCard}
                    onPress={() => router.push(`/conversation/${conv.id}`)}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={styles.mentorName}>
                        {conv.mentor_name}
                      </Text>
                      <Text variant="bodySmall" numberOfLines={2} style={styles.lastMessage}>
                        {conv.last_message}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Mentores Disponíveis
              </Text>
              {filteredMentors.map(mentor => (
                <Card
                  key={mentor.id}
                  style={styles.mentorCard}
                  onPress={() => router.push(`/chat/${mentor.id}`)}
                >
                  <Card.Content style={styles.mentorCardContent}>
                    <Avatar.Text
                      size={56}
                      label={mentor.full_name.substring(0, 2).toUpperCase()}
                      style={styles.avatar}
                    />
                    <View style={styles.mentorInfo}>
                      <Text variant="titleMedium" style={styles.mentorName}>
                        {mentor.full_name}
                      </Text>
                      <Chip mode="flat" style={styles.specialtyChip}>
                        {mentor.specialty}
                      </Chip>
                      {mentor.bio && (
                        <Text variant="bodySmall" numberOfLines={2} style={styles.bio}>
                          {mentor.bio}
                        </Text>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))}
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#64748b',
  },
  searchBar: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  searchHint: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Search Results
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
    color: '#1e293b',
  },
  noResultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  noResultsContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 15,
  },
  noResultsHint: {
    color: '#94a3b8',
    marginTop: 6,
    fontSize: 13,
  },
  searchResultCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultAvatar: {
    backgroundColor: '#2563eb',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  resultSpecialty: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#dbeafe',
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
  excerptText: {
    color: '#374151',
    lineHeight: 18,
  },
  excerptSource: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
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
  clearSearchText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Regular sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e293b',
  },
  conversationCard: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  mentorCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  mentorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2563eb',
    marginRight: 16,
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  specialtyChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#dbeafe',
  },
  bio: {
    color: '#64748b',
  },
  lastMessage: {
    color: '#64748b',
    marginTop: 4,
  },
});
