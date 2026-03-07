import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

export const WhisperSpinner = () => {
  const { colors } = useAppTheme();
  
  // Create 3 animated values for the bars
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.4)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            delay: delay,
          }),
          Animated.timing(anim, {
            toValue: 0.4,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = createAnimation(anim1, 0);
    const a2 = createAnimation(anim2, 150);
    const a3 = createAnimation(anim3, 300);

    Animated.parallel([a1, a2, a3]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.bar, 
          { 
            backgroundColor: colors.primary,
            transform: [{ scaleY: anim1 }],
            opacity: anim1
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bar, 
          { 
            backgroundColor: colors.secondary, // Cyan accent
            transform: [{ scaleY: anim2 }],
            opacity: anim2,
            marginHorizontal: 4
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bar, 
          { 
            backgroundColor: colors.primary,
            transform: [{ scaleY: anim3 }],
            opacity: anim3
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    marginLeft: 8
  },
  bar: {
    width: 6,
    height: 20,
    borderRadius: 3,
  }
});
