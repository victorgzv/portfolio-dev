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
import { useTheme } from './ThemeProvider';

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
  const { colors, isDark } = useTheme();

  const getContainerStyles = (): ViewStyle => ({
    marginBottom: 16,
  });

  const getLabelStyles = (): TextStyle => ({
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
    backgroundColor: disabled ? colors.surface : colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: secureTextEntry ? 48 : 16,
    fontSize: 16,
    color: disabled ? colors.textSecondary : colors.text,
  });

  const getErrorStyles = (): TextStyle => ({
    fontSize: 12,
    color: colors.error,
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
          placeholderTextColor={colors.textSecondary}
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
              color={colors.textSecondary}
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