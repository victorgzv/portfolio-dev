import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import TabNavigator from './TabNavigator';
import PaymentScreen from '../screens/PaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        {isAuthenticated ? (
          // Authenticated screens
          <>
            <Stack.Screen 
              name="(tabs)" 
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="payment" 
              component={PaymentScreen}
              options={{
                headerShown: true,
                title: 'Subscription Plans',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="profile" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                headerBackTitleVisible: false,
              }}
            />
          </>
        ) : (
          // Unauthenticated screens
          <Stack.Screen 
            name="auth" 
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;