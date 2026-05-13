import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export default function SignupScreen({ navigation, setUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters.');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${BACKEND_URL}/signup`, {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      }, { timeout: 10000 });

      if (response.data.success) {
        // Auto login after signup
        setUser({ name: response.data.name, email: response.data.email });
      }
    } catch (error) {
      if (error.response) {
        Alert.alert('Signup Failed', error.response.data.message || 'Could not create account.');
      } else {
        Alert.alert('Connection Error', 'Could not reach server. Make sure backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🪵</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Shilpa-Kala today</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramu Karigar"
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 4 characters"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#bbb"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Handmade in Karnataka 🇮🇳</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#5C3D11', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#A07850', marginTop: 4 },
  form: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#5C3D11', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D5B7',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#333',
  },
  button: {
    backgroundColor: '#C0761A', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#A07850', fontSize: 14 },
  linkBold: { color: '#C0761A', fontWeight: 'bold' },
  footer: { textAlign: 'center', color: '#A07850', marginTop: 32, fontSize: 13 },
});