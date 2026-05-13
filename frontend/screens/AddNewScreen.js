import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
  BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function AddNewScreen({ navigation, user }) {
  const [artisanName, setArtisanName] = useState(user?.name || '');
  const [woodType, setWoodType] = useState('');
  const [price, setPrice] = useState('');

  useFocusEffect(
    useCallback(() => {
      setArtisanName(user?.name || '');
      setWoodType('');
      setPrice('');
    }, [user?.name])
  );

  // Hardware back: jump to the My Photos tab instead of exiting
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        navigation.navigate('My Photos');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation])
  );

  const validate = () => {
    if (!artisanName.trim()) { Alert.alert('Please enter your name'); return false; }
    if (!woodType.trim()) { Alert.alert('Please enter the wood type'); return false; }
    if (!price.trim()) { Alert.alert('Please enter the price'); return false; }
    return true;
  };

  // Option 1: Take photo with camera
  const handleCamera = () => {
    if (!validate()) return;
    navigation.navigate('Camera', { artisanName, woodType, price });
  };

  // Option 2: Pick from gallery
  const handleGalleryPick = async () => {
    if (!validate()) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const photoUri = result.assets[0].uri;
      navigation.navigate('Preview', { photoUri, artisanName, woodType, price, isExisting: false });
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
          <Text style={styles.title}>New Product Photo</Text>
          <Text style={styles.subtitle}>Fill in the details below</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Artisan Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramu Karigar"
            placeholderTextColor="#bbb"
            value={artisanName}
            onChangeText={setArtisanName}
          />

          <Text style={styles.label}>Wood Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rosewood, Sandalwood"
            placeholderTextColor="#bbb"
            value={woodType}
            onChangeText={setWoodType}
          />

          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            placeholderTextColor="#bbb"
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />

          {/* Two buttons: Camera or Gallery */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.halfBtn, styles.cameraBtn]} onPress={handleCamera}>
              <Text style={styles.halfBtnIcon}>📸</Text>
              <Text style={styles.halfBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.halfBtn, styles.galleryBtn]} onPress={handleGalleryPick}>
              <Text style={styles.halfBtnIcon}>🖼️</Text>
              <Text style={styles.halfBtnText}>From Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Handmade in Karnataka 🇮🇳</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#5C3D11' },
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
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  halfBtn: {
    flex: 1, borderRadius: 12, padding: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: { backgroundColor: '#C0761A' },
  galleryBtn: { backgroundColor: '#5C3D11' },
  halfBtnIcon: { fontSize: 24, marginBottom: 4 },
  halfBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  footer: { textAlign: 'center', color: '#A07850', marginTop: 32, fontSize: 13 },
});