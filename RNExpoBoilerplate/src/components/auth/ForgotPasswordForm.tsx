import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ForgotPasswordFormProps {
  onSendReset: (email: string) => Promise<void>;
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSendReset,
  onBackToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleSendReset = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await onSendReset(email);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
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
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#EBF4FF',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Ionicons name="mail" size={40} color="#3B82F6" />
          </View>

          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: '#1F2937', 
            textAlign: 'center',
            marginBottom: 8 
          }}>
            Forgot Password?
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: '#6B7280', 
            textAlign: 'center',
            lineHeight: 24,
          }}>
            No worries! Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Input
            label="Email"
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={error}
            autoComplete="email"
          />
        </View>

        <Button
          title="Send Reset Link"
          onPress={handleSendReset}
          loading={isLoading}
          style={{ marginBottom: 24 }}
        />

        <TouchableOpacity 
          onPress={onBackToLogin}
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={16} color="#3B82F6" />
          <Text style={{ 
            color: '#3B82F6', 
            fontSize: 14, 
            fontWeight: '600',
            marginLeft: 8,
          }}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};