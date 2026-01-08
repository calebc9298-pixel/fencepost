// src/theme/tokens.js
import { fonts } from './fonts';

export const colors = {
  bg: '#F4F1E8',
  surface: '#FFFFFF',
  surface2: 'rgba(255,255,255,0.7)',
  text: '#132016',
  muted: '#5B6B60',
  border: 'rgba(20, 40, 25, 0.12)',

  primary: '#1C3D2C',
  primaryText: '#FFFFFF',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const type = {
  title: { fontSize: 20, fontFamily: fonts.extrabold, letterSpacing: 0.2 },
  h2: { fontSize: 16, fontFamily: fonts.extrabold },
  body: { fontSize: 15, fontFamily: fonts.medium },
  small: { fontSize: 12, fontFamily: fonts.semibold },
};
