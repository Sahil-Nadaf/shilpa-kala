import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, TextInput, Modal,
  BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export default function PreviewScreen({ navigation, route, user }) {
  const {
    photoUri,
    brandedUri: existingUri,
    artisanName: initName,
    woodType: initWood,
    price: initPrice,
    photoId: initPhotoId,
    isExisting,
    imageData: existingImageData,
  } = route.params;

  const [brandedUri, setBrandedUri] = useState(existingUri || null);
  const [brandedBase64, setBrandedBase64] = useState(existingImageData || null);
  const [loading, setLoading] = useState(!isExisting);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoId, setPhotoId] = useState(initPhotoId || null);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(initName);
  const [editWood, setEditWood] = useState(initWood);
  const [editPrice, setEditPrice] = useState(initPrice);

  useEffect(() => {
    if (!isExisting) {
      uploadAndBrand(initName, initWood, initPrice, true);
    }
  }, []);

  // Back (hardware or "← Back" button) always returns to MainTabs,
  // unless the edit modal is open — then back closes the modal first.
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (editVisible) {
          setEditVisible(false);
        } else {
          navigation.navigate('MainTabs');
        }
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation, editVisible])
  );

  const uploadAndBrand = async (name, wood, price, saveToBackend = false) => {
    try {
      setLoading(true);
      setError(false);

      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: 'base64',
      });

      const response = await axios.post(`${BACKEND_URL}/brand-image`, {
        image: base64,
        artisan_name: name,
        wood_type: wood,
        price: price,
      }, { timeout: 30000 });

      const timestamp = Date.now();
      const outputPath = FileSystem.cacheDirectory + `branded_${timestamp}.jpg`;
      await FileSystem.writeAsStringAsync(outputPath, response.data.image, {
        encoding: 'base64',
      });

      setBrandedUri(outputPath);
      setBrandedBase64(response.data.image);

      if (saveToBackend) {
        const saveRes = await axios.post(`${BACKEND_URL}/save-photo`, {
          user_email:   user.email,
          artisan_name: name,
          wood_type:    wood,
          price:        price,
          image_data:   response.data.image,
        }, { timeout: 30000 });
        if (saveRes.data?.photo_id) {
          setPhotoId(saveRes.data.photo_id);
        }
        console.log('Photo saved to backend DB ✅');
      }

    } catch (e) {
      console.error(e);
      setError(true);
      Alert.alert('Error', 'Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const saveToGallery = async () => {
    if (!brandedUri) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access.');
        return;
      }
      const asset = await MediaLibrary.createAssetAsync(brandedUri);
      const album = await MediaLibrary.getAlbumAsync('ShilpaKala');
      if (album == null) {
        await MediaLibrary.createAlbumAsync('ShilpaKala', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      setSaved(true);
      Alert.alert('Saved!', 'Photo saved to ShilpaKala album.');
    } catch (e) {
      console.error(e);
    }
  };

  const sharePhoto = async () => {
    if (!brandedUri) return;
    try {
      const cacheUri = FileSystem.cacheDirectory + `share_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: brandedUri, to: cacheUri });
      await Sharing.shareAsync(cacheUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your Shilpa-Kala product photo',
        UTI: 'public.jpeg',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not share: ' + e.message);
    }
  };

  const deletePhoto = () => {
    Alert.alert('Delete Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (photoId) {
              await axios.delete(`${BACKEND_URL}/photo/${photoId}`);
              console.log('Deleted from backend ✅');
            }
            navigation.navigate('MainTabs');
          } catch (e) {
            Alert.alert('Error', 'Could not delete photo.');
          }
        },
      },
    ]);
  };

  const applyEdit = async () => {
    if (!editName.trim() || !editWood.trim() || !editPrice.trim()) {
      Alert.alert('Please fill in all fields.');
      return;
    }
    setEditVisible(false);
    try {
      setLoading(true);
      setError(false);

      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: 'base64',
      });

      const response = await axios.post(`${BACKEND_URL}/brand-image`, {
        image: base64,
        artisan_name: editName,
        wood_type: editWood,
        price: editPrice,
      }, { timeout: 30000 });

      const outputPath = FileSystem.cacheDirectory + `branded_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(outputPath, response.data.image, { encoding: 'base64' });
      setBrandedUri(outputPath);
      setBrandedBase64(response.data.image);

      if (photoId) {
        await axios.put(`${BACKEND_URL}/photo/${photoId}`, {
          artisan_name: editName,
          wood_type:    editWood,
          price:        editPrice,
          image_data:   response.data.image,
        });
        console.log('Updated in backend ✅');
      }
    } catch (e) {
      console.error(e);
      setError(true);
      Alert.alert('Error', 'Could not re-brand image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Branded Photo</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#C0761A" />
          <Text style={styles.loadingText}>Adding your brand label...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ Could not connect to backend.</Text>
          <Text style={styles.errorSub}>Make sure Python server is running.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => uploadAndBrand(editName, editWood, editPrice, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {brandedUri && !loading && (
        <>
          <Image source={{ uri: brandedUri }} style={styles.image} resizeMode="contain" />

          <View style={styles.infoCard}>
            <Text style={styles.infoRow}>👤 {editName}</Text>
            <Text style={styles.infoRow}>🌲 {editWood}</Text>
            <Text style={styles.infoRow}>💰 ₹{editPrice}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={deletePhoto}>
              <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveToGallery}>
            <Text style={styles.saveBtnText}>{saved ? '✅ Saved to Gallery!' : '💾 Save to Gallery'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={sharePhoto}>
            <Text style={styles.shareBtnText}>📤 Share on WhatsApp / Facebook</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.newPhotoBtn} onPress={() => navigation.navigate('MainTabs')}>
        <Text style={styles.newPhotoBtnText}>🏠 Go to Home</Text>
      </TouchableOpacity>

      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Details</Text>

            <Text style={styles.label}>Artisan Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#bbb" />

            <Text style={styles.label}>Wood Type</Text>
            <TextInput style={styles.input} value={editWood} onChangeText={setEditWood} placeholderTextColor="#bbb" />

            <Text style={styles.label}>Price (₹)</Text>
            <TextInput style={styles.input} value={editPrice} onChangeText={(t) => setEditPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor="#bbb" />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.applyBtn]} onPress={applyEdit}>
                <Text style={styles.applyBtnText}>Apply & Re-brand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { padding: 20, paddingTop: 52, alignItems: 'center' },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: 16,
  },
  backBtn: { color: '#C0761A', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#5C3D11' },
  loadingBox: { alignItems: 'center', padding: 40 },
  loadingText: { color: '#A07850', marginTop: 12, fontSize: 15 },
  errorBox: { alignItems: 'center', padding: 30 },
  errorText: { color: '#cc3300', fontSize: 16, fontWeight: 'bold' },
  errorSub: { color: '#888', marginTop: 6, fontSize: 13 },
  retryBtn: { marginTop: 16, backgroundColor: '#C0761A', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  image: { width: '100%', height: 320, borderRadius: 14, backgroundColor: '#f0e0c0' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    width: '100%', marginTop: 14, borderWidth: 1, borderColor: '#E8D5B7',
  },
  infoRow: { fontSize: 15, color: '#5C3D11', marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 14 },
  editBtn: { flex: 1, backgroundColor: '#FFF0E0', borderWidth: 1.5, borderColor: '#C0761A', borderRadius: 10, padding: 12, alignItems: 'center' },
  editBtnText: { color: '#C0761A', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: '#FFF0F0', borderWidth: 1.5, borderColor: '#cc3300', borderRadius: 10, padding: 12, alignItems: 'center' },
  deleteBtnText: { color: '#cc3300', fontWeight: 'bold', fontSize: 14 },
  saveBtn: { backgroundColor: '#5C3D11', borderRadius: 12, padding: 15, width: '100%', alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  shareBtn: { backgroundColor: '#25D366', borderRadius: 12, padding: 15, width: '100%', alignItems: 'center', marginTop: 10 },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  newPhotoBtn: { marginTop: 12, padding: 14, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: '#C0761A', borderRadius: 12 },
  newPhotoBtnText: { color: '#C0761A', fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#5C3D11', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#5C3D11', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D5B7', borderRadius: 10, padding: 12, fontSize: 15, color: '#333' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  applyBtn: { backgroundColor: '#C0761A' },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
});