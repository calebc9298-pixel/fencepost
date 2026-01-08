import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import AppShell from '../../layout/AppShell';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Login">
      <View style={styles.container} testID="login-screen">
        <Text style={styles.title}>FencePost</Text>
        <Text style={styles.subtitle}>Connect with farmers nationwide</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          testID="login-email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          testID="login-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          testID="login-submit"
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}
          testID="login-to-register"
        >
          <Text style={styles.registerText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF', // White
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2D5016', // Sea green
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    color: '#555',
    fontStyle: 'italic',
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
    marginTop: 10,
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
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#2D5016',
    fontSize: 15,
    fontWeight: '600',
  },
});
