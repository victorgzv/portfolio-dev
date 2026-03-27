import React from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import { useTheme } from '../components/ui/ThemeProvider';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const ProfileScreen: React.FC = () => {
  const { user, logout, isLoading } = useAuthStore();
  const { activeSubscription } = usePaymentStore();
  const { colors, isDark, mode } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };

  const profileItems = [
    {
      icon: 'person-outline',
      title: 'Personal Information',
      subtitle: 'Update your profile details',
      onPress: () => {
        // Navigate to edit profile
        console.log('Edit profile');
      },
    },
    {
      icon: 'card-outline',
      title: 'Subscription',
      subtitle: activeSubscription ? activeSubscription.name : 'No active subscription',
      onPress: () => {
        // Navigate to subscription management
        console.log('Manage subscription');
      },
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage your notification preferences',
      onPress: () => {
        // Navigate to notification settings
        console.log('Notification settings');
      },
    },
    {
      icon: 'shield-outline',
      title: 'Privacy & Security',
      subtitle: 'Account security settings',
      onPress: () => {
        // Navigate to security settings
        console.log('Security settings');
      },
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => {
        // Navigate to help
        console.log('Help & Support');
      },
    },
  ];

  const getThemeDisplayName = () => {
    switch (mode) {
      case 'light':
        return 'Light Theme';
      case 'dark':
        return 'Dark Theme';
      case 'system':
        return `System (${isDark ? 'Dark' : 'Light'})`;
      default:
        return 'System';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Profile Header */}
        <View style={{
          backgroundColor: colors.card,
          padding: 24,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 4,
          }}>
            {user?.name || 'User'}
          </Text>

          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 16,
          }}>
            {user?.email}
          </Text>

          {activeSubscription && (
            <View style={{
              backgroundColor: colors.success,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="star" size={14} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: '600',
                marginLeft: 4,
              }}>
                {activeSubscription.name}
              </Text>
            </View>
          )}
        </View>

        {/* Theme Settings Section */}
        <View style={{ padding: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 16,
          }}>
            Appearance
          </Text>

          <View style={{
            backgroundColor: colors.card,
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                backgroundColor: colors.surface,
                padding: 8,
                borderRadius: 6,
                marginRight: 12,
              }}>
                <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 2,
                }}>
                  Theme
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                }}>
                  {getThemeDisplayName()}
                </Text>
              </View>
            </View>

            {/* Theme Toggle Options */}
            <View style={{ gap: 12 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: colors.text,
                marginBottom: 8,
              }}>
                Choose your preferred theme:
              </Text>
              
              <ThemeToggle variant="dropdown" />
            </View>
          </View>
        </View>

        {/* Profile Items */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 16,
          }}>
            Settings
          </Text>

          {profileItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: colors.card,
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={{
                backgroundColor: colors.surface,
                padding: 8,
                borderRadius: 6,
                marginRight: 12,
              }}>
                <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 2,
                }}>
                  {item.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                }}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Information */}
        <View style={{ padding: 24 }}>
          <View style={{
            backgroundColor: colors.card,
            padding: 20,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              App Information
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <Text style={{ color: colors.textSecondary }}>Version</Text>
              <Text style={{ color: colors.text, fontWeight: '500' }}>1.0.0</Text>
            </View>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <Text style={{ color: colors.textSecondary }}>Build</Text>
              <Text style={{ color: colors.text, fontWeight: '500' }}>2024.01.01</Text>
            </View>
          </View>

          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            loading={isLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;