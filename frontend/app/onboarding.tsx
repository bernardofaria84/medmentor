import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/ThemeContext';

export const ONBOARDING_KEY = '@medmentor_onboarding_seen';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'account-tie-hat' as const,
    iconColor: '#2563eb',
    bgColor: '#eff6ff',
    title: 'Bem-vindo ao MedMentor',
    description:
      'A plataforma de mentoria médica que conecta você aos melhores especialistas do Brasil, disponíveis 24 horas por dia.',
  },
  {
    id: '2',
    icon: 'magnify' as const,
    iconColor: '#0891b2',
    bgColor: '#ecfeff',
    title: 'Encontre seu Mentor',
    description:
      'Escolha entre especialistas renomados em cardiologia, obstetrícia, neurologia e muito mais. Cada mentor traz seu conhecimento real para ajudar você.',
  },
  {
    id: '3',
    icon: 'message-text-outline' as const,
    iconColor: '#7c3aed',
    bgColor: '#f5f3ff',
    title: 'Pergunte e Aprenda',
    description:
      'Faça perguntas complexas por texto ou áudio. Receba respostas fundamentadas no conhecimento especializado do seu mentor.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { colors } = useAppTheme();

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)/home');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
              <MaterialCommunityIcons name={item.icon} size={80} color={item.iconColor} />
            </View>
            <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text variant="bodyLarge" style={[styles.description, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? colors.primary : colors.border },
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        {!isLast ? (
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}

        <Pressable
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          data-testid="onboarding-next-btn"
        >
          <Text style={styles.nextText}>{isLast ? 'Começar' : 'Próximo'}</Text>
          <MaterialCommunityIcons
            name={isLast ? 'check' : 'arrow-right'}
            size={18}
            color="#ffffff"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  iconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
