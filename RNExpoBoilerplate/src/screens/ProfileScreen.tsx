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
import { Button } from '../components/ui/Button';

const ProfileScreen: React.FC = () => {
  const { user, logout, isLoading } = useAuthStore();
  const { activeSubscription } = usePaymentStore();

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Profile Header */}
        <View style={{
          backgroundColor: '#FFFFFF',
          padding: 24,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#3B82F6',
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
            color: '#1F2937',
            marginBottom: 4,
          }}>
            {user?.name || 'User'}
          </Text>

          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 16,
          }}>
            {user?.email}
          </Text>

          {activeSubscription && (
            <View style={{
              backgroundColor: '#10B981',
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

        {/* Profile Items */}
        <View style={{ padding: 24 }}>
          {profileItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={{
                backgroundColor: '#F3F4F6',
                padding: 8,
                borderRadius: 6,
                marginRight: 12,
              }}>
                <Ionicons name={item.icon as any} size={20} color="#6B7280" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 2,
                }}>
                  {item.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                }}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Information */}
        <View style={{ padding: 24 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            padding: 20,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 24,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: 12,
            }}>
              App Information
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <Text style={{ color: '#6B7280' }}>Version</Text>
              <Text style={{ color: '#1F2937', fontWeight: '500' }}>1.0.0</Text>
            </View>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <Text style={{ color: '#6B7280' }}>Build</Text>
              <Text style={{ color: '#1F2937', fontWeight: '500' }}>2024.01.01</Text>
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