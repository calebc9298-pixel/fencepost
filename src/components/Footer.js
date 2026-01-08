import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Footer() {
  const navigation = useNavigation();

  return (
    <View style={styles.footer}>
      <View style={styles.footerContent}>
        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:calebc9298@outlook.com')}
        >
          <Text style={styles.footerLink}>Contact</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.copyright}>
        © {new Date().getFullYear()} FencePost. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 2,
  },
  footerLink: {
    color: '#2D5016',
    fontSize: 10,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  footerDivider: {
    color: '#6c757d',
    fontSize: 10,
  },
  copyright: {
    fontSize: 9,
    color: '#6c757d',
    textAlign: 'center',
  },
});
