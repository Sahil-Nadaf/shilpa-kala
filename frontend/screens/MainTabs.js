import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import GalleryScreen from './GalleryScreen';
import AddNewScreen from './AddNewScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({ user, setUser, navigation }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E8D5B7',
          borderTopWidth: 1.5,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#C0761A',
        tabBarInactiveTintColor: '#A07850',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="My Photos"
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🖼️</Text>,
        }}
      >
        {props => <GalleryScreen {...props} user={user} setUser={setUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Add New"
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>➕</Text>,
        }}
      >
        {props => <AddNewScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}