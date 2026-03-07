import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAppTheme } from '../contexts/ThemeContext';

interface BrandLogoProps {
  size?: number;
  variant?: 'full' | 'white' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 100, variant = 'full' }) => {
  const { colors } = useAppTheme();

  let fillColors = {
    primary: colors.primary, // Teal
    secondary: '#FFFFFF', // White
    dots: '#FFFFFF'
  };

  if (variant === 'white') {
    fillColors = {
      primary: '#FFFFFF',
      secondary: colors.primary, // Teal traces on white
      dots: colors.primary
    };
  } else if (variant === 'dark') {
    fillColors = {
      primary: colors.text, // Navy
      secondary: '#FFFFFF',
      dots: '#FFFFFF'
    };
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Main Cross Shape */}
        <Path
          d="M 45 15 L 45 45 L 15 45 C 12 45 10 47 10 50 L 10 70 C 10 73 12 75 15 75 L 45 75 L 45 105 C 45 108 47 110 50 110 L 70 110 C 73 110 75 108 75 105 L 75 75 L 105 75 C 108 75 110 73 110 70 L 110 50 C 110 47 108 45 105 45 L 75 45 L 75 15 C 75 12 73 10 70 10 L 50 10 C 47 10 45 12 45 15 Z"
          fill={fillColors.primary}
        />
        
        {/* Circuit Traces */}
        <Path
          d="M 55 20 L 55 40 M 65 20 L 65 40 M 20 55 L 40 55 M 20 65 L 40 65 M 80 55 L 100 55 M 80 65 L 100 65 M 55 80 L 55 100 M 65 80 L 65 100"
          stroke={fillColors.secondary}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Circuit Dots */}
        <Circle cx="55" cy="40" r="4" fill={fillColors.dots} />
        <Circle cx="65" cy="40" r="4" fill={fillColors.dots} />
        <Circle cx="40" cy="55" r="4" fill={fillColors.dots} />
        <Circle cx="40" cy="65" r="4" fill={fillColors.dots} />
        <Circle cx="80" cy="55" r="4" fill={fillColors.dots} />
        <Circle cx="80" cy="65" r="4" fill={fillColors.dots} />
        <Circle cx="55" cy="80" r="4" fill={fillColors.dots} />
        <Circle cx="65" cy="80" r="4" fill={fillColors.dots} />
        
        {/* Center Hub */}
        <Circle cx="60" cy="60" r="8" fill={fillColors.secondary} />
        <Circle cx="60" cy="60" r="4" fill={fillColors.primary} />
      </Svg>
    </View>
  );
};
