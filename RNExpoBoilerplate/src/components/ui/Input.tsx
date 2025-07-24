import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputProps } from '../../types';

interface ExtendedInputProps extends InputProps, Omit<TextInputProps, 'value' | 'onChangeText'> {}

export const Input: React.FC<ExtendedInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  disabled = false,
  className = '',
  style,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyles = (): ViewStyle => ({
    marginBottom: 16,
  });

  const getLabelStyles = (): TextStyle => ({
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  });

  const getInputContainerStyles = (): ViewStyle => ({
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  });

  const getInputStyles = (): ViewStyle => ({
    flex: 1,
    borderWidth: 1,
    borderColor: error ? '#EF4444' : isFocused ? '#3B82F6' : '#D1D5DB',
    backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: secureTextEntry ? 48 : 16,
    fontSize: 16,
    color: disabled ? '#9CA3AF' : '#1F2937',
  });

  const getErrorStyles = (): TextStyle => ({
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  });

  const getEyeIconStyles = (): ViewStyle => ({
    position: 'absolute',
    right: 12,
    zIndex: 1,
  });

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={getContainerStyles()}>
      {label && (
        <Text style={getLabelStyles()}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyles()}>
        <TextInput
          style={[getInputStyles(), style]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={getEyeIconStyles()}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={getErrorStyles()}>
          {error}
        </Text>
      )}
    </View>
  );
};