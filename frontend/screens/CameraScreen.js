import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ navigation, route }) {
  const { artisanName, woodType, price } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is needed to take product photos.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      navigation.navigate('Preview', {
        photoUri: photo.uri,
        artisanName,
        woodType,
        price,
        isExisting: false,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not take photo. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />

      {/* Guide Overlay */}
      <View style={styles.overlay}>
        <View style={styles.guideBox}>
          <Text style={styles.guideText}>Place your product here</Text>
        </View>
      </View>

      {/* Top Label */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>📸 Product Capture</Text>
        <Text style={styles.topBarSub}>Center your craft item in the box</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <View style={styles.captureInner} />
          }
        </TouchableOpacity>

        <View style={{ width: 64 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBox: {
    width: 260, height: 260,
    borderWidth: 2, borderColor: '#FFD580', borderStyle: 'dashed',
    borderRadius: 12, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8,
  },
  guideText: {
    color: '#FFD580', fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  topBar: { position: 'absolute', top: 56, width: '100%', alignItems: 'center' },
  topBarText: {
    color: '#fff', fontSize: 18, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },
  topBarSub: { color: '#FFD580', fontSize: 12, marginTop: 2 },
  bottomBar: {
    position: 'absolute', bottom: 40, width: '100%',
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingHorizontal: 20,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  backBtnText: { color: '#fff', fontSize: 14 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 24 },
  permissionText: { fontSize: 16, color: '#5C3D11', textAlign: 'center', marginBottom: 20 },
  permissionBtn: { backgroundColor: '#C0761A', padding: 14, borderRadius: 10 },
  permissionBtnText: { color: '#fff', fontWeight: 'bold' },
});
