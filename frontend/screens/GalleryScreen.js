import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert, Dimensions, ActivityIndicator, BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { BACKEND_URL } from '../config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 2;
const PAGE_SIZE = 20;

export default function GalleryScreen({ navigation, user, setUser }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);          // first fetch only
  const [refreshing, setRefreshing] = useState(false);   // pull-to-refresh
  const [loadingMore, setLoadingMore] = useState(false); // bottom load-more
  const [hasMore, setHasMore] = useState(false);

  // Fetch photos from backend every time screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPhotos('reset');
    }, [])
  );

  // Hardware back: confirm exit (this tab is the app's "home")
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

  const fetchPhotos = async (mode = 'reset') => {
    const isReset = mode === 'reset';
    const offset  = isReset ? 0 : photos.length;

    // Pick which spinner to show. The first fetch keeps the central spinner;
    // later resets use the pull-to-refresh indicator so the grid stays visible.
    if (isReset && photos.length > 0) setRefreshing(true);
    if (!isReset) setLoadingMore(true);

    try {
      const response = await axios.get(`${BACKEND_URL}/photos/${user.email}`, {
        params:  { limit: PAGE_SIZE, offset },
        timeout: 10000,
      });

      if (response.data.success) {
        const fetchedAt = Date.now();
        const newOnes = await Promise.all(
          response.data.photos.map(async (photo) => {
            const filePath = FileSystem.cacheDirectory + `gallery_${photo.id}.jpg`;
            await FileSystem.writeAsStringAsync(filePath, photo.image_data, {
              encoding: 'base64',
            });
            // `filePath` is the raw path used for file I/O (re-branding in Preview).
            // `uri` carries a cache-busting query string so React Native's <Image>
            // reloads fresh pixels after a photo was edited.
            return { ...photo, filePath, uri: `${filePath}?t=${fetchedAt}` };
          })
        );
        setPhotos(prev => isReset ? newOnes : [...prev, ...newOnes]);
        setHasMore(!!response.data.has_more);
      }
    } catch (e) {
      console.error('Fetch photos error:', e);
      Alert.alert('Error', 'Could not load photos. Make sure backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || refreshing || !hasMore) return;
    fetchPhotos('append');
  };

  const deletePhoto = (id) => {
    Alert.alert('Delete Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${BACKEND_URL}/photo/${id}`);
            setPhotos(prev => prev.filter(p => p.id !== id));
          } catch (e) {
            Alert.alert('Error', 'Could not delete photo.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Preview', {
        photoUri:     item.filePath,  // raw path (needed for re-branding)
        brandedUri:   item.uri,       // cache-busted path for <Image>
        artisanName:  item.artisan_name,
        woodType:     item.wood_type,
        price:        item.price,
        photoId:      item.id,
        isExisting:   true,
        imageData:    item.image_data,
      })}
    >
      <Image source={{ uri: item.uri }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.artisan_name}</Text>
        <Text style={styles.cardDetail} numberOfLines={1}>{item.wood_type}</Text>
        <Text style={styles.cardPrice}>₹{item.price}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(item.id)}>
        <Text style={styles.deleteBtnText}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          <Text style={styles.headerSub}>Welcome, {user.name} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', onPress: () => setUser(null) },
          ])}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C0761A" />
          <Text style={styles.loadingText}>Loading your photos...</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyTitle}>No photos yet!</Text>
          <Text style={styles.emptySub}>Tap "Add New" to create your first branded product photo.</Text>
        </View>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchPhotos('reset')}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#C0761A" />
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8D5B7',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#5C3D11' },
  headerSub: { fontSize: 13, color: '#A07850', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#FFF0E0', borderWidth: 1, borderColor: '#E8D5B7',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  logoutText: { color: '#C0761A', fontWeight: '600', fontSize: 13 },
  list: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: ITEM_SIZE, backgroundColor: '#fff', borderRadius: 12,
    overflow: 'hidden', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  cardImage: { width: '100%', height: ITEM_SIZE, backgroundColor: '#f0e0c0' },
  cardInfo: { padding: 8 },
  cardName: { fontSize: 13, fontWeight: 'bold', color: '#5C3D11' },
  cardDetail: { fontSize: 11, color: '#A07850', marginTop: 2 },
  cardPrice: { fontSize: 13, fontWeight: 'bold', color: '#C0761A', marginTop: 2 },
  deleteBtn: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 13 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#A07850', marginTop: 12, fontSize: 15 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#5C3D11' },
  emptySub: { fontSize: 14, color: '#A07850', textAlign: 'center', marginTop: 8 },
  footerLoader: { paddingVertical: 18, alignItems: 'center' },
});