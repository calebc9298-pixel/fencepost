import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import AppShell from '../../layout/AppShell';

export default function PrivacyPolicyScreen() {
  return (
    <AppShell title="Privacy Policy" fullWidth>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last Updated: January 7, 2026</Text>
        
        <Text style={styles.paragraph}>
          FencePost ("we", "our", or "us") operates the FencePost mobile and web application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        
        <Text style={styles.subheading}>Personal Information</Text>
        <Text style={styles.paragraph}>
          When you register for an account, we collect:
        </Text>
        <Text style={styles.bullet}>• Email address</Text>
        <Text style={styles.bullet}>• Username</Text>
        <Text style={styles.bullet}>• Location (city, state, ZIP code)</Text>
        <Text style={styles.bullet}>• Farm information (acreage, optional contact information)</Text>

        <Text style={styles.subheading}>User-Generated Content</Text>
        <Text style={styles.paragraph}>
          We collect content you create, including:
        </Text>
        <Text style={styles.bullet}>• Posts, FencePosts, and comments</Text>
        <Text style={styles.bullet}>• Photos and images you upload</Text>
        <Text style={styles.bullet}>• Farm activity data (planting, spraying, harvesting, etc.)</Text>
        <Text style={styles.bullet}>• Likes and interactions with other users' content</Text>

        <Text style={styles.subheading}>Automatically Collected Information</Text>
        <Text style={styles.paragraph}>
          When you use our app, we automatically collect:
        </Text>
        <Text style={styles.bullet}>• Device information and identifiers</Text>
        <Text style={styles.bullet}>• Usage data and analytics</Text>
        <Text style={styles.bullet}>• Error logs and crash reports</Text>

        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your information to:</Text>
        <Text style={styles.bullet}>• Provide and maintain the FencePost service</Text>
        <Text style={styles.bullet}>• Create and manage your account</Text>
        <Text style={styles.bullet}>• Display your posts to other users in your region</Text>
        <Text style={styles.bullet}>• Send you notifications about interactions with your content</Text>
        <Text style={styles.bullet}>• Improve our services and develop new features</Text>
        <Text style={styles.bullet}>• Detect and prevent fraud, abuse, and security issues</Text>
        <Text style={styles.bullet}>• Respond to your support requests</Text>

        <Text style={styles.heading}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We display your username, location (city/state), and user-generated content to other authenticated users of the app. We do not sell your personal information to third parties.
        </Text>
        <Text style={styles.paragraph}>
          We may share information with:
        </Text>
        <Text style={styles.bullet}>• Service providers (Firebase/Google Cloud for hosting and authentication)</Text>
        <Text style={styles.bullet}>• Analytics providers (to understand app usage)</Text>
        <Text style={styles.bullet}>• Law enforcement when required by law</Text>

        <Text style={styles.heading}>4. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely using Firebase/Google Cloud services. We implement industry-standard security measures including:
        </Text>
        <Text style={styles.bullet}>• Encrypted data transmission (HTTPS/SSL)</Text>
        <Text style={styles.bullet}>• Secure authentication</Text>
        <Text style={styles.bullet}>• Access controls and user permissions</Text>
        <Text style={styles.bullet}>• Regular security monitoring</Text>

        <Text style={styles.heading}>5. Your Rights and Choices</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bullet}>• Access your personal information</Text>
        <Text style={styles.bullet}>• Update or correct your profile information</Text>
        <Text style={styles.bullet}>• Delete your posts and comments</Text>
        <Text style={styles.bullet}>• Request account deletion by contacting us</Text>

        <Text style={styles.heading}>6. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          FencePost is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
        </Text>

        <Text style={styles.heading}>7. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </Text>

        <Text style={styles.heading}>8. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.paragraph}>Email: calebc9298@outlook.com</Text>

        <View style={styles.spacer} />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
    paddingBottom: 40,
  },
  updated: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D5016',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2C2C2C',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2C2C2C',
    marginBottom: 6,
    marginLeft: 16,
  },
  spacer: {
    height: 20,
  },
});
