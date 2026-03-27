import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoginCredentials } from '../../types';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onForgotPassword,
}) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});

  const { login, loginWithGoogle, loginWithApple, isLoading } = useAuthStore();

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(credentials);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message || 'An error occurred during Google login');
    }
  };

  const handleAppleLogin = async () => {
    try {
      await loginWithApple();
    } catch (error: any) {
      Alert.alert('Apple Login Failed', error.message || 'An error occurred during Apple login');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: '#1F2937', 
            textAlign: 'center',
            marginBottom: 8 
          }}>
            Welcome Back
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: '#6B7280', 
            textAlign: 'center' 
          }}>
            Sign in to your account
          </Text>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={credentials.email}
            onChangeText={(email) => setCredentials({ ...credentials, email })}
            keyboardType="email-address"
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={credentials.password}
            onChangeText={(password) => setCredentials({ ...credentials, password })}
            secureTextEntry
            error={errors.password}
            autoComplete="password"
          />

          <TouchableOpacity 
            onPress={onForgotPassword}
            style={{ alignSelf: 'flex-end', marginTop: 8 }}
          >
            <Text style={{ color: '#3B82F6', fontSize: 14 }}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          style={{ marginBottom: 24 }}
        />

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          <Text style={{ 
            marginHorizontal: 16, 
            color: '#6B7280', 
            fontSize: 14 
          }}>
            or continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        </View>

        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginBottom: 32 
        }}>
          <Button
            title="Google"
            onPress={handleGoogleLogin}
            variant="outline"
            style={{ flex: 1, marginRight: 8 }}
            disabled={isLoading}
          />
          
          {Platform.OS === 'ios' && (
            <Button
              title="Apple"
              onPress={handleAppleLogin}
              variant="outline"
              style={{ flex: 1, marginLeft: 8 }}
              disabled={isLoading}
            />
          )}
        </View>

        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={{ 
              color: '#3B82F6', 
              fontSize: 14, 
              fontWeight: '600' 
            }}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};