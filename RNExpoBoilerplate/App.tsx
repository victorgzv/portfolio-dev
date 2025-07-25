import 'react-native-reanimated';
import './global.css';

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import initialization functions
import { initializeStripe, stripeConfig } from './src/lib/stripe';
import { initializeRevenueCat } from './src/lib/revenuecat';

// Import stores
import { useAuthStore } from './src/store/authStore';

// Import components
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/components/ui/ThemeProvider';

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
    },
  },
});

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Stripe
      await initializeStripe();
      
      // Initialize RevenueCat
      await initializeRevenueCat();
      
      // Check authentication status
      await checkAuth();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert(
        'Initialization Error', 
        'There was a problem initializing the app. Please restart the application.'
      );
      setIsInitialized(true); // Still allow the app to continue
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
      }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <StripeProvider
            publishableKey={stripeConfig.publishableKey}
            merchantIdentifier={stripeConfig.merchantIdentifier}
            urlScheme={stripeConfig.urlScheme}
          >
            <AppNavigator />
            <StatusBar style="auto" />
          </StripeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
