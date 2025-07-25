import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  TouchableOpacityProps,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { ButtonProps } from '../../types';
import { useTheme } from './ThemeProvider';

interface ExtendedButtonProps extends ButtonProps, Omit<TouchableOpacityProps, 'onPress'> {}

export const Button: React.FC<ExtendedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingVertical: 8, paddingHorizontal: 16 },
      md: { paddingVertical: 12, paddingHorizontal: 20 },
      lg: { paddingVertical: 16, paddingHorizontal: 24 },
    };

    // Variant styles using theme colors
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: disabled ? colors.secondary : colors.primary,
      },
      secondary: {
        backgroundColor: disabled ? colors.surface : colors.surface,
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.border,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: loading ? 0.7 : 1,
    };
  };

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size styles
    const sizeStyles: Record<string, TextStyle> = {
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    };

    // Variant styles using theme colors
    const variantStyles: Record<string, TextStyle> = {
      primary: {
        color: disabled ? '#FFFFFF' : '#FFFFFF',
      },
      secondary: {
        color: disabled ? colors.textSecondary : colors.text,
      },
      outline: {
        color: disabled ? colors.textSecondary : colors.primary,
      },
      ghost: {
        color: disabled ? colors.textSecondary : colors.primary,
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getSpinnerColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
      default:
        return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={getSpinnerColor()}
          style={{ marginRight: title ? 8 : 0 }}
        />
      )}
      {title && (
        <Text style={getTextStyles()}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};