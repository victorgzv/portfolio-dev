import React from 'react';
import { TouchableOpacity, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'switch' | 'dropdown';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabel = false, 
  size = 'md',
  variant = 'button' 
}) => {
  const { isDark, mode, toggleTheme, setTheme } = useTheme();

  const sizeConfig = {
    sm: { icon: 16, padding: 8, text: 12 },
    md: { icon: 20, padding: 10, text: 14 },
    lg: { icon: 24, padding: 12, text: 16 },
  };

  const config = sizeConfig[size];

  const getThemeIcon = () => {
    switch (mode) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      case 'system':
      default:
        return 'phone-portrait';
    }
  };

  const getThemeLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System';
    }
  };

  if (variant === 'dropdown') {
    return (
      <View style={{
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Light Option */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: config.padding,
            backgroundColor: mode === 'light' ? (isDark ? '#4B5563' : '#E5E7EB') : 'transparent',
          }}
          onPress={() => setTheme('light')}
        >
          <Ionicons 
            name="sunny" 
            size={config.icon} 
            color={isDark ? '#F9FAFB' : '#1F2937'} 
          />
          <Text style={{
            marginLeft: 8,
            fontSize: config.text,
            color: isDark ? '#F9FAFB' : '#1F2937',
            fontWeight: mode === 'light' ? '600' : '400',
          }}>
            Light
          </Text>
        </TouchableOpacity>

        {/* Dark Option */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: config.padding,
            backgroundColor: mode === 'dark' ? (isDark ? '#4B5563' : '#E5E7EB') : 'transparent',
          }}
          onPress={() => setTheme('dark')}
        >
          <Ionicons 
            name="moon" 
            size={config.icon} 
            color={isDark ? '#F9FAFB' : '#1F2937'} 
          />
          <Text style={{
            marginLeft: 8,
            fontSize: config.text,
            color: isDark ? '#F9FAFB' : '#1F2937',
            fontWeight: mode === 'dark' ? '600' : '400',
          }}>
            Dark
          </Text>
        </TouchableOpacity>

        {/* System Option */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: config.padding,
            backgroundColor: mode === 'system' ? (isDark ? '#4B5563' : '#E5E7EB') : 'transparent',
          }}
          onPress={() => setTheme('system')}
        >
          <Ionicons 
            name="phone-portrait" 
            size={config.icon} 
            color={isDark ? '#F9FAFB' : '#1F2937'} 
          />
          <Text style={{
            marginLeft: 8,
            fontSize: config.text,
            color: isDark ? '#F9FAFB' : '#1F2937',
            fontWeight: mode === 'system' ? '600' : '400',
          }}>
            System
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'switch') {
    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
        borderRadius: 20,
        padding: 2,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: mode === 'light' ? (isDark ? '#F9FAFB' : '#FFFFFF') : 'transparent',
            borderRadius: 18,
            padding: config.padding,
            minWidth: 40,
            alignItems: 'center',
          }}
          onPress={() => setTheme('light')}
        >
          <Ionicons 
            name="sunny" 
            size={config.icon} 
            color={mode === 'light' ? '#F59E0B' : (isDark ? '#9CA3AF' : '#6B7280')} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: mode === 'dark' ? (isDark ? '#F9FAFB' : '#FFFFFF') : 'transparent',
            borderRadius: 18,
            padding: config.padding,
            minWidth: 40,
            alignItems: 'center',
          }}
          onPress={() => setTheme('dark')}
        >
          <Ionicons 
            name="moon" 
            size={config.icon} 
            color={mode === 'dark' ? '#6366F1' : (isDark ? '#9CA3AF' : '#6B7280')} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: mode === 'system' ? (isDark ? '#F9FAFB' : '#FFFFFF') : 'transparent',
            borderRadius: 18,
            padding: config.padding,
            minWidth: 40,
            alignItems: 'center',
          }}
          onPress={() => setTheme('system')}
        >
          <Ionicons 
            name="phone-portrait" 
            size={config.icon} 
            color={mode === 'system' ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280')} 
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Default button variant
  return (
    <TouchableOpacity
      style={{
        flexDirection: showLabel ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
        borderRadius: 8,
        padding: config.padding,
        minWidth: showLabel ? undefined : 44,
        minHeight: 44,
      }}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={getThemeIcon() as any} 
        size={config.icon} 
        color={isDark ? '#F9FAFB' : '#1F2937'} 
      />
      {showLabel && (
        <Text style={{
          marginLeft: showLabel ? 8 : 0,
          marginTop: showLabel ? 0 : 4,
          fontSize: config.text,
          color: isDark ? '#F9FAFB' : '#1F2937',
          fontWeight: '500',
        }}>
          {getThemeLabel()}
        </Text>
      )}
    </TouchableOpacity>
  );
};