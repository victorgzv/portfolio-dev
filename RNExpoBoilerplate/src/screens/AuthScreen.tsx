import React, { useState } from 'react';
import { View, SafeAreaView, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'forgot-password';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { resetPassword } = useAuthStore();

  const handleForgotPassword = async (email: string) => {
    try {
      await resetPassword(email);
      Alert.alert(
        'Password Reset', 
        'If an account with that email exists, we\'ve sent you a password reset link.',
        [{ text: 'OK', onPress: () => setMode('login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'register':
        return (
          <RegisterForm
            onSwitchToLogin={() => setMode('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onSendReset={handleForgotPassword}
            onBackToLogin={() => setMode('login')}
          />
        );
      case 'login':
      default:
        return (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default AuthScreen;