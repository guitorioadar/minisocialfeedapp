export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    tint: '#0a7ea4',
    tabIconDefault: '#7c7c7c',
    tabIconSelected: '#0a7ea4',
    border: '#e5e5e5',
    cardBackground: '#f9f9f9',
    error: '#ef4444',
    success: '#22c55e',
    red: '#ef4444',
  },
  dark: {
    text: '#ffffff',
    background: '#121212',
    tint: '#4fc3f7',
    tabIconDefault: '#7c7c7c',
    tabIconSelected: '#4fc3f7',
    border: '#333333',
    cardBackground: '#1e1e1e',
    error: '#ef4444',
    success: '#22c55e',
    red: '#ef4444',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const isTablet = () => {
  const dimensions = require('react-native').Dimensions.get('window');
  return dimensions.width >= 768;
};
