import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Chip, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getMentors, getConversations } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function HomeScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    loadData();
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

        <Searchbar
          placeholder="Buscar mentores ou especialidades"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

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
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
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
