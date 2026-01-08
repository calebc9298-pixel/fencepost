import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import AppShell from '../../layout/AppShell';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const determineRegion = state => {
    // US regions based on state
    const regions = {
      midwest: [
        'IA',
        'IL',
        'IN',
        'KS',
        'MI',
        'MN',
        'MO',
        'ND',
        'NE',
        'OH',
        'SD',
        'WI',
      ],
      south: [
        'AL',
        'AR',
        'FL',
        'GA',
        'KY',
        'LA',
        'MS',
        'NC',
        'OK',
        'SC',
        'TN',
        'TX',
        'VA',
        'WV',
      ],
      west: [
        'AK',
        'AZ',
        'CA',
        'CO',
        'HI',
        'ID',
        'MT',
        'NM',
        'NV',
        'OR',
        'UT',
        'WA',
        'WY',
      ],
      northeast: [
        'CT',
        'DE',
        'MA',
        'MD',
        'ME',
        'NH',
        'NJ',
        'NY',
        'PA',
        'RI',
        'VT',
      ],
    };

    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state.toUpperCase())) {
        return region;
      }
    }
    return 'other';
  };

  const normalizeUsername = value => (value || '').trim();

  const validateUsername = value => {
    const username = normalizeUsername(value);
    if (!username) return { ok: true, username: '' };
    if (username.length < 3 || username.length > 20) {
      return { ok: false, message: 'Username must be 3-20 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        ok: false,
        message: 'Username can only use letters, numbers, and _',
      };
    }
    return { ok: true, username };
  };

  const handleRegister = async () => {
    console.log('Register button clicked', formData);

    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.street ||
      !formData.city ||
      !formData.state ||
      !formData.zipCode
    ) {
      alert('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const usernameCheck = validateUsername(formData.username);
    if (!usernameCheck.ok) {
      alert(usernameCheck.message);
      return;
    }

    setLoading(true);
    try {
      const username = usernameCheck.username;
      const usernameLower = username ? username.toLowerCase() : '';

      if (usernameLower) {
        const existing = await getDocs(
          query(
            collection(db, 'users'),
            where('usernameLower', '==', usernameLower),
            limit(1)
          )
        );

        if (!existing.empty) {
          alert('That username is already taken');
          return;
        }
      }

      console.log('Creating user...');
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      console.log('User created, saving to Firestore...');
      // Create user profile in Firestore
      const region = determineRegion(formData.state);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: formData.name,
        username: username || null,
        usernameLower: usernameLower || null,
        email: formData.email,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state.toUpperCase(),
          zipCode: formData.zipCode,
        },
        region: region,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Registration complete!');
      alert('Account created successfully!');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Register">
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title} testID="register-title">
            Create Account
          </Text>

          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            testID="register-name"
            value={formData.name}
            onChangeText={value => updateField('name', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="Username (optional)"
            testID="register-username"
            value={formData.username}
            onChangeText={value => updateField('username', value)}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            testID="register-email"
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            testID="register-password"
            value={formData.password}
            onChangeText={value => updateField('password', value)}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            testID="register-confirmPassword"
            value={formData.confirmPassword}
            onChangeText={value => updateField('confirmPassword', value)}
            secureTextEntry
          />

          <Text style={styles.sectionTitle}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            testID="register-street"
            value={formData.street}
            onChangeText={value => updateField('street', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="City"
            testID="register-city"
            value={formData.city}
            onChangeText={value => updateField('city', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="State (e.g., IA)"
            testID="register-state"
            value={formData.state}
            onChangeText={value => updateField('state', value)}
            maxLength={2}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.input}
            placeholder="Zip Code"
            testID="register-zip"
            value={formData.zipCode}
            onChangeText={value => updateField('zipCode', value)}
            keyboardType="numeric"
            maxLength={5}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
            testID="register-submit"
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backLink}
            testID="register-back-to-login"
          >
            <Text style={styles.backText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2D5016', // Sea green
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    color: '#2D5016',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#81C784',
  },
  button: {
    backgroundColor: '#ACD1AF',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  buttonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  backLink: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  backText: {
    color: '#2D5016',
    fontSize: 15,
    fontWeight: '600',
  },
});
