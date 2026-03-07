import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

export const TypingBubble = () => {
  const { colors } = useAppTheme();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(450 - i * 150),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: colors.textSecondary, transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 4,
    elevation: 1,
    maxWidth: '30%',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
