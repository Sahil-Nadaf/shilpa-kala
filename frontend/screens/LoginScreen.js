import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, BackHandler, ToastAndroid
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export default function LoginScreen({ navigation, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        Alert.alert('Exit Shilpa-Kala?', 'Are you sure you want to exit the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [])
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${BACKEND_URL}/login`, {
        email: email.trim(),
        password: password.trim(),
      }, { timeout: 10000 });

      if (response.data.success) {
        const msg = `Welcome back, ${response.data.name}! Successfully logged in.`;
        if (Platform.OS === 'android') {
          ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else {
          Alert.alert('Logged in', msg);
        }
        setUser({ name: response.data.name, email: response.data.email });
      }
    } catch (error) {
      if (error.response) {
        Alert.alert('Login Failed', error.response.data.message || 'Invalid credentials.');
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
          <Text style={styles.title}>Shilpa-Kala</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
            placeholder="Your password"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Login</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Handmade in Karnataka 🇮🇳</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { padding: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#5C3D11', letterSpacing: 1 },
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