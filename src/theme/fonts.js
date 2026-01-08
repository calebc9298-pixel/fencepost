import { Platform } from 'react-native';

export const fonts =
  Platform.OS === 'web'
    ? {
        regular: 'Manrope',
        medium: 'Manrope',
        semibold: 'Manrope',
        bold: 'Manrope',
        extrabold: 'Manrope',
      }
    : {
        regular: 'Manrope_400Regular',
        medium: 'Manrope_500Medium',
        semibold: 'Manrope_600SemiBold',
        bold: 'Manrope_700Bold',
        extrabold: 'Manrope_800ExtraBold',
      };
