// src/theme/shadow.js
import { Platform } from 'react-native';

export const softShadow = Platform.select({
  web: {
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});

export const shadowStyles = {
  sm: Platform.select({
    web: {
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  }),
  md: Platform.select({
    web: {
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  }),
};
