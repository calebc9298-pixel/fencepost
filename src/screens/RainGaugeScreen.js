import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePost } from '../context/PostContext';
import AppShell from '../layout/AppShell';

export default function RainGaugeScreen({ navigation }) {
  const { userProfile, recordRainfall } = useAuth();
  const { addPost } = usePost();
  const [rainfall, setRainfall] = useState('');
  const [notes, setNotes] = useState('');
  const [postToStateAlso, setPostToStateAlso] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const month = today.toLocaleString('default', { month: 'long' });
    const day = today.getDate();
    const year = today.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const handleSubmit = () => {
    if (!rainfall || rainfall.trim() === '') {
      Alert.alert('Error', 'Please enter rainfall amount');
      return;
    }

    const rainfallValue = parseFloat(rainfall.replace(/,/g, ''));
    if (isNaN(rainfallValue) || rainfallValue < 0) {
      Alert.alert('Error', 'Please enter a valid rainfall amount');
      return;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    // Record rainfall to profile
    recordRainfall(rainfallValue, currentYear, currentMonth);

    const newPost = {
      type: 'rainGauge',
      rainfall: rainfallValue,
      notes: notes.trim(),
      date: getTodayDate(),
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      zipCode: userProfile?.zipCode || '',
      chatRoom: 'national',
      username: userProfile?.username || null,
    };

    addPost(newPost);
    if (postToStateAlso && userProfile?.state) {
      addPost({ ...newPost, chatRoom: 'state' });
    }
    Alert.alert('Success', 'Rain gauge reading posted!');
    setRainfall('');
    setNotes('');
    setPostToStateAlso(false);
    navigation.navigate('Feed');
  };

  return (
    <AppShell title="Rain Gauge">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Rain Gauge</Text>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Date:</Text>
            <Text style={styles.dateText}>{getTodayDate()}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rainfall Amount (inches) *</Text>
              <TextInput
                style={styles.input}
                value={rainfall}
                onChangeText={setRainfall}
                placeholder="0.00"
                keyboardType="decimal-pad"
                testID="raingauge-rainfall"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional observations (optional)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="raingauge-notes"
              />
            </View>

            {userProfile && (
              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>Location:</Text>
                <Text style={styles.locationText}>
                  {userProfile.city}, {userProfile.state}
                </Text>
              </View>
            )}

            <View style={styles.postOptionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPostToStateAlso(v => !v)}
                disabled={!userProfile?.state}
              >
                <View
                  style={[
                    styles.checkbox,
                    postToStateAlso && styles.checkboxChecked,
                    !userProfile?.state && styles.checkboxDisabled,
                  ]}
                />
                <Text style={styles.checkboxLabel}>
                  Post to state board as well
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            testID="raingauge-submit"
          >
            <Text style={styles.submitButtonText}>Post Rain Gauge Reading</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 12,
  },
  headerIcon: {
    fontSize: 48,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D5016',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dateContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 6,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#81C784',
  },
  dateLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D5016',
    letterSpacing: 0.5,
  },
  form: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 6,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#81C784',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 2,
    borderColor: '#81C784',
    borderRadius: 6,
    padding: 14,
    fontSize: 17,
    backgroundColor: 'white',
    color: '#2C2C2C',
  },
  textArea: {
    height: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  locationLabel: {
    fontSize: 15,
    color: '#6c757d',
    fontWeight: '600',
  },
  locationText: {
    fontSize: 15,
    color: '#2D5016',
    fontWeight: '700',
  },
  postOptionsRow: {
    marginTop: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#2D5016',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#ACD1AF',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxLabel: {
    color: '#2D5016',
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#ACD1AF',
    padding: 18,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  submitButtonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
