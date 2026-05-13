import React, { useState, useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MainTabs from './screens/MainTabs';
import CameraScreen from './screens/CameraScreen';
import PreviewScreen from './screens/PreviewScreen';

const Stack = createNativeStackNavigator();
const USER_FILE = FileSystem.documentDirectory + 'user.json';

export default function App() {
  const [user, setUserState] = useState(null);
  const [booting, setBooting] = useState(true);

  // On app start, restore the saved user (if any). Hold the splash for at
  // least MIN_SPLASH_MS so the logo is actually visible before transitioning.
  useEffect(() => {
    const MIN_SPLASH_MS = 1500;
    const minDelay = new Promise(r => setTimeout(r, MIN_SPLASH_MS));
    const restore = (async () => {
      try {
        const info = await FileSystem.getInfoAsync(USER_FILE);
        if (info.exists) {
          const json = await FileSystem.readAsStringAsync(USER_FILE);
          const saved = JSON.parse(json);
          if (saved && saved.email) setUserState(saved);
        }
      } catch (e) {
        console.warn('Could not restore session:', e);
      }
    })();
    Promise.all([restore, minDelay]).then(() => setBooting(false));
  }, []);

  // Wrapper passed down as setUser — also writes/clears the persisted session.
  const setUser = async (next) => {
    setUserState(next);
    try {
      if (next) {
        await FileSystem.writeAsStringAsync(USER_FILE, JSON.stringify(next));
      } else {
        await FileSystem.deleteAsync(USER_FILE, { idempotent: true });
      }
    } catch (e) {
      console.warn('Could not persist session:', e);
    }
  };

  if (booting) {
    return (
      <View style={styles.bootScreen}>
        <Image
          source={require('./assets/splash-icon.png')}
          style={styles.bootLogo}
          resizeMode="contain"
        />
        <Text style={styles.bootTitle}>Shilpa-Kala</Text>
        <ActivityIndicator size="small" color="#C0761A" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {props => <SignupScreen {...props} setUser={setUser} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs">
              {props => <MainTabs {...props} user={user} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Preview">
              {props => <PreviewScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  bootLogo: { width: 140, height: 140 },
  bootTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C3D11',
    letterSpacing: 1,
  },
});
