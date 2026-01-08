import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import AppShell from '../../layout/AppShell';

export default function TermsOfServiceScreen() {
  return (
    <AppShell title="Terms of Service" fullWidth>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last Updated: January 7, 2026</Text>
        
        <Text style={styles.paragraph}>
          Welcome to FencePost. By accessing or using our application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use FencePost.
        </Text>

        <Text style={styles.heading}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By creating an account and using FencePost, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms of Service.
        </Text>

        <Text style={styles.heading}>2. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for:
        </Text>
        <Text style={styles.bullet}>• Maintaining the security of your account credentials</Text>
        <Text style={styles.bullet}>• All activities that occur under your account</Text>
        <Text style={styles.bullet}>• Providing accurate and current information</Text>
        <Text style={styles.bullet}>• Notifying us immediately of any unauthorized access</Text>

        <Text style={styles.heading}>3. User Content and Conduct</Text>
        
        <Text style={styles.subheading}>Content Ownership</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post. By posting content to FencePost, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content within the application.
        </Text>

        <Text style={styles.subheading}>Acceptable Use</Text>
        <Text style={styles.paragraph}>You agree NOT to:</Text>
        <Text style={styles.bullet}>• Post false, misleading, or fraudulent information</Text>
        <Text style={styles.bullet}>• Harass, threaten, or abuse other users</Text>
        <Text style={styles.bullet}>• Post spam or commercial advertisements</Text>
        <Text style={styles.bullet}>• Violate any applicable laws or regulations</Text>
        <Text style={styles.bullet}>• Infringe on others' intellectual property rights</Text>
        <Text style={styles.bullet}>• Upload malicious software or viruses</Text>
        <Text style={styles.bullet}>• Attempt to access other users' accounts or data</Text>
        <Text style={styles.bullet}>• Impersonate another person or entity</Text>

        <Text style={styles.heading}>4. Farm Data and Information</Text>
        <Text style={styles.paragraph}>
          FencePost allows you to share farming data and activities. While we strive to provide a platform for accurate information sharing:
        </Text>
        <Text style={styles.bullet}>• We do not verify the accuracy of user-posted farm data</Text>
        <Text style={styles.bullet}>• Information shared is for educational and networking purposes</Text>
        <Text style={styles.bullet}>• You should verify any farming practices before implementation</Text>
        <Text style={styles.bullet}>• We are not liable for decisions made based on information shared</Text>

        <Text style={styles.heading}>5. Content Moderation</Text>
        <Text style={styles.paragraph}>
          We reserve the right to:
        </Text>
        <Text style={styles.bullet}>• Review, monitor, or remove any content at our discretion</Text>
        <Text style={styles.bullet}>• Suspend or terminate accounts that violate these terms</Text>
        <Text style={styles.bullet}>• Ban users for repeated violations or severe misconduct</Text>
        <Text style={styles.bullet}>• Modify or discontinue features at any time</Text>

        <Text style={styles.heading}>6. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The FencePost application, including its design, features, and code, is owned by FencePost and protected by copyright and other intellectual property laws. You may not copy, modify, or distribute our application without permission.
        </Text>

        <Text style={styles.heading}>7. Disclaimers</Text>
        <Text style={styles.paragraph}>
          FencePost is provided "as is" without warranties of any kind. We do not guarantee:
        </Text>
        <Text style={styles.bullet}>• Uninterrupted or error-free service</Text>
        <Text style={styles.bullet}>• Accuracy or reliability of user-generated content</Text>
        <Text style={styles.bullet}>• Security of data transmission over the internet</Text>
        <Text style={styles.bullet}>• Specific results from using farming information shared</Text>

        <Text style={styles.heading}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, FencePost and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the application, including but not limited to:
        </Text>
        <Text style={styles.bullet}>• Loss of profits or revenue</Text>
        <Text style={styles.bullet}>• Loss of data</Text>
        <Text style={styles.bullet}>• Farming losses or crop failures</Text>
        <Text style={styles.bullet}>• Equipment damage</Text>

        <Text style={styles.heading}>9. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify and hold harmless FencePost from any claims, damages, or expenses arising from your use of the application, your violation of these terms, or your violation of any rights of another user.
        </Text>

        <Text style={styles.heading}>10. Privacy</Text>
        <Text style={styles.paragraph}>
          Your use of FencePost is also governed by our Privacy Policy. Please review our Privacy Policy to understand our data practices.
        </Text>

        <Text style={styles.heading}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these Terms of Service at any time. Continued use of FencePost after changes constitutes acceptance of the modified terms. We will notify users of significant changes.
        </Text>

        <Text style={styles.heading}>12. Termination</Text>
        <Text style={styles.paragraph}>
          You may terminate your account at any time by contacting us. We may terminate or suspend your access immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users or our business interests.
        </Text>

        <Text style={styles.heading}>13. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms of Service are governed by the laws of the United States. Any disputes shall be resolved in the applicable courts.
        </Text>

        <Text style={styles.heading}>14. Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms of Service, please contact us at:
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
